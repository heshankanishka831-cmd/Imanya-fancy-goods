package service

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"distribution-management/internal/audit/service"
	cartRepo "distribution-management/internal/carts/repository"
	catalogModel "distribution-management/internal/catalog/model"
	customerModel "distribution-management/internal/customers/model"
	customerRepo "distribution-management/internal/customers/repository"
	customerService "distribution-management/internal/customers/service"
	invService "distribution-management/internal/inventory/service"
	loyaltyService "distribution-management/internal/loyalty/service"
	"distribution-management/internal/orders/dto"
	"distribution-management/internal/orders/model"
	"distribution-management/internal/orders/repository"
	whatsappService "distribution-management/internal/whatsapp/service"

	"gorm.io/gorm"
)

type OrderService interface {
	Checkout(ctx context.Context, sessionID string, customerIDOpt *string, req *dto.CheckoutRequest, ip, ua string) (*dto.OrderResponse, error)
	GuestCheckout(ctx context.Context, sessionID string, req *dto.GuestCheckoutRequest, ip, ua string) (*dto.OrderResponse, error)
	GetGuestOrder(ctx context.Context, orderNumber, token, phone string) (*dto.OrderResponse, error)
	RetryWhatsAppNotification(ctx context.Context, orderID string) (*dto.OrderResponse, error)
	UpdatePaymentStatus(ctx context.Context, actorID, orderID, newPaymentStatus, notes, source, ip, ua string) (*dto.OrderResponse, error)
	RecordWhatsAppReceiptWebhook(ctx context.Context, senderPhone, messageText string) (bool, string, error)
	UpdateStatus(ctx context.Context, actorID, orderID, newStatus, notes string, ip, ua string) (*dto.OrderResponse, error)
	GetOrderByID(ctx context.Context, id string) (*dto.OrderResponse, error)
	ListOrders(ctx context.Context, filter repository.OrderFilter) ([]dto.OrderResponse, int64, error)
	GetWhatsAppLink(ctx context.Context, orderID string) (string, error)
}

type orderService struct {
	repo            repository.OrderRepository
	cartRepo        cartRepo.CartRepository
	customerRepo    customerRepo.CustomerRepository
	customerService customerService.CustomerService
	invService      invService.InventoryService
	loyaltyService  loyaltyService.LoyaltyService
	whatsappService whatsappService.WhatsAppService
	auditService    service.AuditService
	db              *gorm.DB
}

func NewOrderService(
	repo repository.OrderRepository,
	cartRepo cartRepo.CartRepository,
	customerRepo customerRepo.CustomerRepository,
	customerService customerService.CustomerService,
	invService invService.InventoryService,
	loyaltyService loyaltyService.LoyaltyService,
	whatsappService whatsappService.WhatsAppService,
	auditService service.AuditService,
	db *gorm.DB,
) OrderService {
	return &orderService{
		repo:            repo,
		cartRepo:        cartRepo,
		customerRepo:    customerRepo,
		customerService: customerService,
		invService:      invService,
		loyaltyService:  loyaltyService,
		whatsappService: whatsappService,
		auditService:    auditService,
		db:              db,
	}
}

func generateGuestAccessToken() string {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("gst_%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

func normalizePhoneDigits(phone string) string {
	var b strings.Builder
	for _, r := range phone {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	digits := b.String()
	if strings.HasPrefix(digits, "94") && len(digits) == 11 {
		return "0" + digits[2:]
	}
	return digits
}

func (s *orderService) Checkout(ctx context.Context, sessionID string, customerIDOpt *string, req *dto.CheckoutRequest, ip, ua string) (*dto.OrderResponse, error) {
	if idemKey := strings.TrimSpace(req.IdempotencyKey); idemKey != "" {
		if existing, err := s.repo.GetOrderByIdempotencyKey(ctx, idemKey); err == nil && existing != nil {
			resp := s.formatOrderResponse(existing)
			resp.GuestAccessToken = existing.GuestAccessToken
			return resp, nil
		}
	}

	// Retrieve cart
	cart, err := s.cartRepo.GetBySessionOrCustomer(ctx, sessionID, customerIDOpt)
	if err != nil || len(cart.Items) == 0 {
		return nil, errors.New("shopping cart is empty. Please add products before checking out")
	}

	var createdOrderID string

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Resolve authenticated customer record if logged in; never create fake customers for guests
		var customer *customerModel.Customer
		var customerIDPtr *string
		isGuest := true

		if customerIDOpt != nil && *customerIDOpt != "" {
			c, err := s.customerRepo.GetByUserID(ctx, *customerIDOpt)
			if err == nil && c != nil {
				customer = c
				customerIDPtr = &c.ID
				isGuest = false
				if req.CustomerName != "" {
					customer.Name = req.CustomerName
				}
				if req.CustomerPhone != "" {
					customer.Phone = req.CustomerPhone
				}
				if req.CustomerEmail != "" && customer.Email == "" {
					customer.Email = req.CustomerEmail
				}
				if req.DeliveryAddress != "" {
					customer.DeliveryAddress = req.DeliveryAddress
				}
				_ = s.customerRepo.Update(ctx, customer)
			}
		}

		orderNumber, err := s.repo.GetNextOrderNumber(ctx)
		if err != nil {
			return fmt.Errorf("failed to generate order sequence number: %w", err)
		}

		var totalAmount float64
		var orderItems []model.OrderItem
		now := time.Now()

		for _, item := range cart.Items {
			if !item.Product.IsActive {
				return fmt.Errorf("product '%s' is no longer active", item.Product.Name)
			}

			// Validate minimum order quantity against latest database product rule
			minQty := 1
			if item.Product.MinOrderQuantity > 1 {
				minQty = item.Product.MinOrderQuantity
			}
			if item.Quantity < minQty {
				return fmt.Errorf("product %q requires a minimum purchase quantity of %d units (cart contains %d). Please update your cart quantity before confirming the order", item.Product.Name, minQty, item.Quantity)
			}

			// Atomic inventory stock allocation check with row lock
			refID := fmt.Sprintf("ORDER-%s", orderNumber)
			notes := fmt.Sprintf("Reserved for customer order %s", orderNumber)
			if err := s.invService.AllocateStockTx(ctx, tx, item.ProductID, item.Quantity, refID, notes); err != nil {
				return fmt.Errorf("failed to allocate stock for product '%s': %w", item.Product.Name, err)
			}

			// Authoritative effective price calculation by backend
			effectivePrice, discountAmount, discountPercent, isDiscountActive := item.Product.EffectivePrice(now)
			lineSubtotal := math.Round(float64(item.Quantity)*effectivePrice*100) / 100
			totalAmount = math.Round((totalAmount+lineSubtotal)*100) / 100

			var origPrice *float64
			if isDiscountActive {
				orig := item.Product.SellingPrice
				origPrice = &orig
			}

			orderItems = append(orderItems, model.OrderItem{
				ProductID:       item.ProductID,
				ProductSKU:      item.Product.SKU,
				ProductName:     item.Product.Name,
				UnitOfMeasure:   item.Product.UnitOfMeasure,
				UnitPrice:       effectivePrice,
				Quantity:        item.Quantity,
				Subtotal:        lineSubtotal,
				OriginalPrice:   origPrice,
				DiscountPercent: discountPercent,
				DiscountAmount:  discountAmount,
			})
		}

		guestToken := ""
		if isGuest {
			guestToken = generateGuestAccessToken()
		}

		order := &model.Order{
			OrderNumber:      orderNumber,
			CustomerID:       customerIDPtr,
			IsGuest:          isGuest,
			GuestName:        strings.TrimSpace(req.CustomerName),
			GuestPhone:       strings.TrimSpace(req.CustomerPhone),
			GuestEmail:       strings.TrimSpace(req.CustomerEmail),
			GuestAccessToken: guestToken,
			IdempotencyKey:   strings.TrimSpace(req.IdempotencyKey),
			PaymentStatus:    "PAYMENT_PENDING",
			PaymentMethod:    "BANK_TRANSFER_WHATSAPP",
			Status:           "PENDING",
			TotalAmount:      totalAmount,
			DeliveryAddress:  strings.TrimSpace(req.DeliveryAddress),
			CustomerNotes:    strings.TrimSpace(req.CustomerNotes),
			Items:            orderItems,
			StatusHistory: []model.OrderStatusHistory{
				{
					NewStatus: "PENDING",
					Notes:     "Order submitted through checkout",
				},
			},
			PaymentHistory: []model.OrderPaymentHistory{
				{
					NewStatus: "PAYMENT_PENDING",
					Source:    "SYSTEM",
					Notes:     "Awaiting bank transfer receipt via WhatsApp",
				},
			},
		}

		if err := s.repo.CreateOrder(ctx, tx, order); err != nil {
			return err
		}

		// Clear cart items
		if err := s.cartRepo.ClearCart(ctx, tx, cart.ID); err != nil {
			return err
		}

		createdOrderID = order.ID
		return nil
	})

	if err != nil {
		return nil, err
	}

	freshOrder, err := s.repo.GetOrderByID(ctx, createdOrderID)
	if err != nil {
		return nil, err
	}

	// Send WhatsApp notification (Cloud API if configured, else link ready); never fail order if WhatsApp fails
	waStatus, waErr := s.whatsappService.SendOrderNotification(ctx, freshOrder)
	_ = s.repo.UpdateWhatsAppNotification(ctx, freshOrder.ID, waStatus, waErr)
	freshOrder.WhatsAppNotificationStatus = waStatus
	freshOrder.WhatsAppNotificationError = waErr

	s.auditService.LogAction(ctx, nil, "CHECKOUT_ORDER", "orders", freshOrder.ID, nil, freshOrder, ip, ua)

	resp := s.formatOrderResponse(freshOrder)
	if freshOrder.IsGuest {
		resp.GuestAccessToken = freshOrder.GuestAccessToken
	}
	return resp, nil
}

func (s *orderService) GuestCheckout(ctx context.Context, sessionID string, req *dto.GuestCheckoutRequest, ip, ua string) (*dto.OrderResponse, error) {
	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)
	if firstName == "" || lastName == "" {
		return nil, errors.New("first name and last name are required")
	}

	phoneDigits := normalizePhoneDigits(req.WhatsAppNumber)
	if len(phoneDigits) < 9 || len(phoneDigits) > 15 {
		return nil, errors.New("please provide a valid WhatsApp phone number (9 to 15 digits)")
	}

	emailTrim := strings.TrimSpace(req.Email)
	if emailTrim != "" {
		if _, err := mail.ParseAddress(emailTrim); err != nil {
			return nil, errors.New("please provide a valid email address")
		}
	}

	address := strings.TrimSpace(req.DeliveryAddress)
	city := strings.TrimSpace(req.City)
	province := strings.TrimSpace(req.Province)
	postalCode := strings.TrimSpace(req.PostalCode)
	if address == "" || city == "" || province == "" {
		return nil, errors.New("complete delivery address, city, and province are required")
	}

	fullAddressParts := []string{address, city, province}
	if postalCode != "" {
		fullAddressParts = append(fullAddressParts, postalCode)
	}
	formattedAddress := strings.Join(fullAddressParts, ", ")

	// Duplicate submission protection via idempotency key
	idemKey := strings.TrimSpace(req.IdempotencyKey)
	if idemKey != "" {
		if existing, err := s.repo.GetOrderByIdempotencyKey(ctx, idemKey); err == nil && existing != nil {
			resp := s.formatOrderResponse(existing)
			resp.GuestAccessToken = existing.GuestAccessToken
			return resp, nil
		}
	}

	type lineItemSpec struct {
		Product  catalogModel.Product
		Quantity int
	}

	var lineSpecs []lineItemSpec
	var cartIDToClear string

	// Primary source: server-side session cart; fallback: explicit product IDs + quantities
	cart, cartErr := s.cartRepo.GetBySessionOrCustomer(ctx, sessionID, nil)
	if cartErr == nil && cart != nil && len(cart.Items) > 0 {
		cartIDToClear = cart.ID
		for _, ci := range cart.Items {
			lineSpecs = append(lineSpecs, lineItemSpec{
				Product:  ci.Product,
				Quantity: ci.Quantity,
			})
		}
	} else if len(req.Items) > 0 {
		for _, itemInput := range req.Items {
			var prod catalogModel.Product
			if err := s.db.WithContext(ctx).Where("id = ?", itemInput.ProductID).First(&prod).Error; err != nil {
				return nil, fmt.Errorf("invalid product ID '%s'", itemInput.ProductID)
			}
			lineSpecs = append(lineSpecs, lineItemSpec{
				Product:  prod,
				Quantity: itemInput.Quantity,
			})
		}
	} else {
		return nil, errors.New("shopping cart is empty. Please add products before confirming your order")
	}

	var createdOrderID string

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		orderNumber, err := s.repo.GetNextOrderNumber(ctx)
		if err != nil {
			return fmt.Errorf("failed to generate order number: %w", err)
		}

		var totalAmount float64
		var orderItems []model.OrderItem
		now := time.Now()

		for _, spec := range lineSpecs {
			if !spec.Product.IsActive {
				return fmt.Errorf("product '%s' is no longer active", spec.Product.Name)
			}

			minQty := 1
			if spec.Product.MinOrderQuantity > 1 {
				minQty = spec.Product.MinOrderQuantity
			}
			if spec.Quantity < minQty {
				return fmt.Errorf("product %q requires a minimum purchase quantity of %d units (requested %d)", spec.Product.Name, minQty, spec.Quantity)
			}

			refID := fmt.Sprintf("ORDER-%s", orderNumber)
			notes := fmt.Sprintf("Reserved for guest order %s", orderNumber)
			if err := s.invService.AllocateStockTx(ctx, tx, spec.Product.ID, spec.Quantity, refID, notes); err != nil {
				return fmt.Errorf("failed to allocate stock for product '%s': %w", spec.Product.Name, err)
			}

			effectivePrice, discountAmount, discountPercent, isDiscountActive := spec.Product.EffectivePrice(now)
			lineSubtotal := math.Round(float64(spec.Quantity)*effectivePrice*100) / 100
			totalAmount = math.Round((totalAmount+lineSubtotal)*100) / 100

			var origPrice *float64
			if isDiscountActive {
				orig := spec.Product.SellingPrice
				origPrice = &orig
			}

			orderItems = append(orderItems, model.OrderItem{
				ProductID:       spec.Product.ID,
				ProductSKU:      spec.Product.SKU,
				ProductName:     spec.Product.Name,
				UnitOfMeasure:   spec.Product.UnitOfMeasure,
				UnitPrice:       effectivePrice,
				Quantity:        spec.Quantity,
				Subtotal:        lineSubtotal,
				OriginalPrice:   origPrice,
				DiscountPercent: discountPercent,
				DiscountAmount:  discountAmount,
			})
		}

		fullName := fmt.Sprintf("%s %s", firstName, lastName)
		guestToken := generateGuestAccessToken()

		order := &model.Order{
			OrderNumber:      orderNumber,
			CustomerID:       nil, // Never create fake customer records for guest orders
			IsGuest:          true,
			GuestFirstName:   firstName,
			GuestLastName:    lastName,
			GuestName:        fullName,
			GuestPhone:       strings.TrimSpace(req.WhatsAppNumber),
			GuestEmail:       emailTrim,
			GuestCity:        city,
			GuestProvince:    province,
			GuestPostalCode:  postalCode,
			GuestAccessToken: guestToken,
			IdempotencyKey:   idemKey,
			PaymentStatus:    "PAYMENT_PENDING",
			PaymentMethod:    "BANK_TRANSFER_WHATSAPP",
			Status:           "PENDING",
			TotalAmount:      totalAmount,
			DeliveryAddress:  formattedAddress,
			CustomerNotes:    strings.TrimSpace(req.DeliveryInstructions),
			Items:            orderItems,
			StatusHistory: []model.OrderStatusHistory{
				{
					NewStatus: "PENDING",
					Notes:     "Guest order submitted through storefront checkout",
				},
			},
			PaymentHistory: []model.OrderPaymentHistory{
				{
					NewStatus: "PAYMENT_PENDING",
					Source:    "SYSTEM",
					Notes:     "Awaiting bank transfer receipt via WhatsApp",
				},
			},
		}

		if err := s.repo.CreateOrder(ctx, tx, order); err != nil {
			return err
		}

		if cartIDToClear != "" {
			if err := s.cartRepo.ClearCart(ctx, tx, cartIDToClear); err != nil {
				return err
			}
		}

		createdOrderID = order.ID
		return nil
	})

	if err != nil {
		return nil, err
	}

	freshOrder, err := s.repo.GetOrderByID(ctx, createdOrderID)
	if err != nil {
		return nil, err
	}

	// Send WhatsApp notification non-destructively (never fail or delete order if notification fails)
	waStatus, waErr := s.whatsappService.SendOrderNotification(ctx, freshOrder)
	_ = s.repo.UpdateWhatsAppNotification(ctx, freshOrder.ID, waStatus, waErr)
	freshOrder.WhatsAppNotificationStatus = waStatus
	freshOrder.WhatsAppNotificationError = waErr

	s.auditService.LogAction(ctx, nil, "GUEST_CHECKOUT_ORDER", "orders", freshOrder.ID, nil, freshOrder, ip, ua)

	resp := s.formatOrderResponse(freshOrder)
	resp.GuestAccessToken = freshOrder.GuestAccessToken
	return resp, nil
}

func (s *orderService) GetGuestOrder(ctx context.Context, orderNumber, token, phone string) (*dto.OrderResponse, error) {
	cleanNum := strings.TrimSpace(orderNumber)
	if cleanNum == "" {
		return nil, errors.New("order number is required")
	}

	order, err := s.repo.GetOrderByNumber(ctx, cleanNum)
	if err != nil || order == nil {
		return nil, errors.New("order not found")
	}

	// Verify either secure guest access token OR matching WhatsApp phone number
	authorized := false
	if token != "" && order.GuestAccessToken != "" {
		if subtle.ConstantTimeCompare([]byte(token), []byte(order.GuestAccessToken)) == 1 {
			authorized = true
		}
	}
	if !authorized && phone != "" {
		submittedDigits := normalizePhoneDigits(phone)
		storedPhone := order.GuestPhone
		if !order.IsGuest && order.Customer != nil {
			storedPhone = order.Customer.Phone
		}
		storedDigits := normalizePhoneDigits(storedPhone)
		if submittedDigits != "" && submittedDigits == storedDigits {
			authorized = true
		}
	}

	if !authorized {
		return nil, errors.New("unauthorized: please provide a valid verification token or matching WhatsApp number")
	}

	return s.formatOrderResponse(order), nil
}

func (s *orderService) RetryWhatsAppNotification(ctx context.Context, orderID string) (*dto.OrderResponse, error) {
	order, err := s.repo.GetOrderByID(ctx, orderID)
	if err != nil || order == nil {
		return nil, errors.New("order not found")
	}
	waStatus, waErr := s.whatsappService.SendOrderNotification(ctx, order)
	_ = s.repo.UpdateWhatsAppNotification(ctx, order.ID, waStatus, waErr)
	order.WhatsAppNotificationStatus = waStatus
	order.WhatsAppNotificationError = waErr
	return s.formatOrderResponse(order), nil
}

func (s *orderService) UpdateStatus(ctx context.Context, actorID, orderID, newStatus, notes string, ip, ua string) (*dto.OrderResponse, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		order, err := s.repo.GetOrderForUpdate(ctx, tx, orderID)
		if err != nil {
			return errors.New("order not found")
		}

		oldStatus := order.Status
		if oldStatus == newStatus {
			return nil
		}

		if oldStatus == "COMPLETED" || oldStatus == "CANCELLED" {
			return fmt.Errorf("order is already in final state '%s' and cannot be modified", oldStatus)
		}

		// Transition logic — require verified payment before confirming, processing, or completing
		switch newStatus {
		case "CONFIRMED":
			if oldStatus != "PENDING" {
				return fmt.Errorf("cannot transition from %s to CONFIRMED", oldStatus)
			}
			if order.PaymentStatus != "PAYMENT_VERIFIED" {
				return errors.New("payment must be verified before confirming this order (current payment status: " + order.PaymentStatus + ")")
			}
		case "PROCESSING":
			if oldStatus != "PENDING" && oldStatus != "CONFIRMED" {
				return fmt.Errorf("cannot transition from %s to PROCESSING", oldStatus)
			}
			if order.PaymentStatus != "PAYMENT_VERIFIED" {
				return errors.New("payment must be verified before processing this order (current payment status: " + order.PaymentStatus + ")")
			}
		case "COMPLETED":
			if oldStatus != "PROCESSING" && oldStatus != "CONFIRMED" {
				return fmt.Errorf("cannot transition from %s to COMPLETED", oldStatus)
			}
			if order.PaymentStatus != "PAYMENT_VERIFIED" {
				return errors.New("payment must be verified before completing this order (current payment status: " + order.PaymentStatus + ")")
			}
			// Deduct from physical stock
			for _, it := range order.Items {
				refID := fmt.Sprintf("ORD-%s", order.OrderNumber)
				if err := s.invService.DeductAllocatedStockTx(ctx, tx, it.ProductID, it.Quantity, refID, "Order fulfilled"); err != nil {
					return err
				}
			}
		case "CANCELLED":
			// Return reserved stock
			for _, it := range order.Items {
				refID := fmt.Sprintf("ORD-%s-CANCEL", order.OrderNumber)
				if err := s.invService.CancelOrderRestockTx(ctx, tx, it.ProductID, it.Quantity, refID, "Order cancelled - stock restored"); err != nil {
					return err
				}
			}
		default:
			return fmt.Errorf("unknown status target '%s'", newStatus)
		}

		order.Status = newStatus
		if err := s.repo.UpdateOrder(ctx, tx, order); err != nil {
			return err
		}

		history := &model.OrderStatusHistory{
			OrderID:        order.ID,
			PreviousStatus: oldStatus,
			NewStatus:      newStatus,
			ChangedBy:      &actorID,
			Notes:          notes,
		}

		if err := s.repo.AddStatusHistory(ctx, tx, history); err != nil {
			return err
		}

		s.auditService.LogAction(ctx, &actorID, "UPDATE_ORDER_STATUS", "orders", order.ID,
			map[string]string{"status": oldStatus},
			map[string]string{"status": newStatus, "notes": notes},
			ip, ua,
		)

		return nil
	})

	if err != nil {
		return nil, err
	}

	freshOrder, err := s.repo.GetOrderByID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	// Automatically recalculate customer loyalty tier and eligible lifetime spending (only for registered customers)
	if freshOrder.CustomerID != nil && *freshOrder.CustomerID != "" && s.loyaltyService != nil {
		_, _ = s.loyaltyService.RecalculateCustomer(ctx, *freshOrder.CustomerID)
	}

	return s.formatOrderResponse(freshOrder), nil
}

func (s *orderService) UpdatePaymentStatus(ctx context.Context, actorID, orderID, newPaymentStatus, notes, source, ip, ua string) (*dto.OrderResponse, error) {
	target := strings.ToUpper(strings.TrimSpace(newPaymentStatus))
	switch target {
	case "PAYMENT_PENDING", "RECEIPT_RECEIVED", "PAYMENT_VERIFIED", "PAYMENT_REJECTED":
	default:
		return nil, fmt.Errorf("invalid payment status '%s'", newPaymentStatus)
	}

	cleanNotes := strings.TrimSpace(notes)
	if target == "PAYMENT_REJECTED" && cleanNotes == "" {
		return nil, errors.New("rejection reason is required when rejecting payment")
	}

	cleanSource := strings.ToUpper(strings.TrimSpace(source))
	if cleanSource == "" {
		cleanSource = "ADMIN"
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		order, err := s.repo.GetOrderForUpdate(ctx, tx, orderID)
		if err != nil {
			return errors.New("order not found")
		}

		if order.Status == "CANCELLED" {
			return errors.New("cannot update payment status for a cancelled order")
		}

		oldPaymentStatus := order.PaymentStatus
		if oldPaymentStatus == "" {
			oldPaymentStatus = "PAYMENT_PENDING"
		}

		order.PaymentStatus = target
		if cleanNotes != "" {
			order.PaymentNotes = cleanNotes
		}

		var actorPtr *string
		if strings.TrimSpace(actorID) != "" {
			idCopy := actorID
			actorPtr = &idCopy
		}

		if target == "PAYMENT_VERIFIED" {
			now := time.Now().UTC()
			order.PaymentVerifiedAt = &now
			order.PaymentVerifiedBy = actorPtr
		} else {
			order.PaymentVerifiedAt = nil
			order.PaymentVerifiedBy = nil
		}

		if err := s.repo.UpdateOrder(ctx, tx, order); err != nil {
			return err
		}

		history := &model.OrderPaymentHistory{
			OrderID:        order.ID,
			PreviousStatus: oldPaymentStatus,
			NewStatus:      target,
			ChangedBy:      actorPtr,
			Source:         cleanSource,
			Notes:          cleanNotes,
		}
		if err := s.repo.AddPaymentHistory(ctx, tx, history); err != nil {
			return err
		}

		s.auditService.LogAction(ctx, actorPtr, "UPDATE_PAYMENT_STATUS", "orders", order.ID,
			map[string]string{"payment_status": oldPaymentStatus},
			map[string]string{"payment_status": target, "source": cleanSource, "notes": cleanNotes},
			ip, ua,
		)
		return nil
	})
	if err != nil {
		return nil, err
	}

	freshOrder, err := s.repo.GetOrderByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	return s.formatOrderResponse(freshOrder), nil
}

var orderNumberPattern = regexp.MustCompile(`ORD-\d{8}-[A-Za-z0-9]+`)

func (s *orderService) RecordWhatsAppReceiptWebhook(ctx context.Context, senderPhone, messageText string) (bool, string, error) {
	match := orderNumberPattern.FindString(messageText)
	if match == "" {
		return false, "", nil
	}

	order, err := s.repo.GetOrderByNumber(ctx, match)
	if err != nil || order == nil {
		return false, match, nil
	}

	if order.PaymentStatus == "PAYMENT_VERIFIED" {
		return true, order.OrderNumber, nil
	}

	note := fmt.Sprintf("WhatsApp receipt message received from %s", strings.TrimSpace(senderPhone))
	if _, err := s.UpdatePaymentStatus(ctx, "", order.ID, "RECEIPT_RECEIVED", note, "WHATSAPP_WEBHOOK", "", "WhatsApp-Webhook"); err != nil {
		return false, order.OrderNumber, err
	}
	return true, order.OrderNumber, nil
}

func (s *orderService) GetOrderByID(ctx context.Context, id string) (*dto.OrderResponse, error) {
	order, err := s.repo.GetOrderByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return s.formatOrderResponse(order), nil
}

func (s *orderService) ListOrders(ctx context.Context, filter repository.OrderFilter) ([]dto.OrderResponse, int64, error) {
	orders, total, err := s.repo.ListOrders(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	var res []dto.OrderResponse
	for _, o := range orders {
		res = append(res, *s.formatOrderResponse(&o))
	}
	return res, total, nil
}

func (s *orderService) GetWhatsAppLink(ctx context.Context, orderID string) (string, error) {
	order, err := s.repo.GetOrderByID(ctx, orderID)
	if err != nil {
		return "", errors.New("order not found")
	}
	link := s.whatsappService.GenerateOrderLink(order)
	if link == "" {
		return "", errors.New("store owner WhatsApp number is not configured in system settings")
	}
	return link, nil
}

func (s *orderService) formatOrderResponse(o *model.Order) *dto.OrderResponse {
	var items []dto.OrderItemResponse
	for _, it := range o.Items {
		items = append(items, dto.OrderItemResponse{
			ID:              it.ID,
			ProductID:       it.ProductID,
			ProductSKU:      it.ProductSKU,
			ProductName:     it.ProductName,
			UnitOfMeasure:   it.UnitOfMeasure,
			UnitPrice:       it.UnitPrice,
			OriginalPrice:   it.OriginalPrice,
			DiscountPercent: it.DiscountPercent,
			DiscountAmount:  it.DiscountAmount,
			Quantity:        it.Quantity,
			Subtotal:        it.Subtotal,
		})
	}

	var history []dto.OrderStatusHistoryResponse
	for _, h := range o.StatusHistory {
		name := "System"
		if h.Changer != nil {
			name = fmt.Sprintf("%s %s", h.Changer.FirstName, h.Changer.LastName)
		}
		history = append(history, dto.OrderStatusHistoryResponse{
			ID:             h.ID,
			PreviousStatus: h.PreviousStatus,
			NewStatus:      h.NewStatus,
			ChangedByName:  name,
			Notes:          h.Notes,
			CreatedAt:      h.CreatedAt,
		})
	}

	waURL := s.whatsappService.GenerateOrderLink(o)
	storePhone := s.whatsappService.GetStorePhoneNumber()

	custName := o.GuestName
	custPhone := o.GuestPhone
	custEmail := o.GuestEmail
	if !o.IsGuest && o.Customer != nil {
		if o.Customer.Name != "" {
			custName = o.Customer.Name
		}
		if o.Customer.Phone != "" {
			custPhone = o.Customer.Phone
		}
		if o.Customer.Email != "" {
			custEmail = o.Customer.Email
		}
	}

	var paymentHistory []dto.OrderPaymentHistoryResponse
	for _, ph := range o.PaymentHistory {
		name := "System"
		if ph.Changer != nil {
			name = fmt.Sprintf("%s %s", ph.Changer.FirstName, ph.Changer.LastName)
		} else if ph.Source == "WHATSAPP_WEBHOOK" {
			name = "WhatsApp Webhook"
		}
		paymentHistory = append(paymentHistory, dto.OrderPaymentHistoryResponse{
			ID:             ph.ID,
			PreviousStatus: ph.PreviousStatus,
			NewStatus:      ph.NewStatus,
			ChangedByName:  name,
			Source:         ph.Source,
			Notes:          ph.Notes,
			CreatedAt:      ph.CreatedAt,
		})
	}

	payStatus := o.PaymentStatus
	if payStatus == "" {
		payStatus = "PAYMENT_PENDING"
	}
	payMethod := o.PaymentMethod
	if payMethod == "" {
		payMethod = "BANK_TRANSFER_WHATSAPP"
	}

	return &dto.OrderResponse{
		ID:                         o.ID,
		OrderNumber:                o.OrderNumber,
		CustomerID:                 o.CustomerID,
		IsGuest:                    o.IsGuest,
		CustomerName:               custName,
		CustomerPhone:              custPhone,
		CustomerEmail:              custEmail,
		GuestCity:                  o.GuestCity,
		GuestProvince:              o.GuestProvince,
		GuestPostalCode:            o.GuestPostalCode,
		Status:                     o.Status,
		PaymentStatus:              payStatus,
		PaymentMethod:              payMethod,
		PaymentNotes:               o.PaymentNotes,
		PaymentVerifiedAt:          o.PaymentVerifiedAt,
		TotalAmount:                o.TotalAmount,
		DeliveryAddress:            o.DeliveryAddress,
		CustomerNotes:              o.CustomerNotes,
		InternalNotes:              o.InternalNotes,
		WhatsAppURL:                waURL,
		StoreWhatsAppNumber:        storePhone,
		WhatsAppNotificationStatus: o.WhatsAppNotificationStatus,
		WhatsAppNotificationError:  o.WhatsAppNotificationError,
		Items:                      items,
		StatusHistory:              history,
		PaymentHistory:             paymentHistory,
		CreatedAt:                  o.CreatedAt,
		UpdatedAt:                  o.UpdatedAt,
	}
}
