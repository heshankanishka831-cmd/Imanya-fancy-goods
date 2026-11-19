package service

import (
	"context"
	"errors"
	"fmt"

	"wholesale-management/internal/audit/service"
	cartRepo "wholesale-management/internal/carts/repository"
	customerRepo "wholesale-management/internal/customers/repository"
	customerService "wholesale-management/internal/customers/service"
	invService "wholesale-management/internal/inventory/service"
	"wholesale-management/internal/orders/dto"
	"wholesale-management/internal/orders/model"
	"wholesale-management/internal/orders/repository"
	whatsappService "wholesale-management/internal/whatsapp/service"

	"gorm.io/gorm"
)

type OrderService interface {
	Checkout(ctx context.Context, sessionID string, customerIDOpt *string, req *dto.CheckoutRequest, ip, ua string) (*dto.OrderResponse, error)
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
		whatsappService: whatsappService,
		auditService:    auditService,
		db:              db,
	}
}

func (s *orderService) Checkout(ctx context.Context, sessionID string, customerIDOpt *string, req *dto.CheckoutRequest, ip, ua string) (*dto.OrderResponse, error) {
	// Retrieve cart
	cart, err := s.cartRepo.GetBySessionOrCustomer(ctx, sessionID, customerIDOpt)
	if err != nil || len(cart.Items) == 0 {
		return nil, errors.New("shopping cart is empty. Please add products before checking out")
	}

	var createdOrderID string

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Resolve customer record
		customer, err := s.customerService.GetOrCreateByPhone(ctx, req.CustomerName, req.CustomerPhone, req.CustomerEmail, req.DeliveryAddress)
		if err != nil {
			return fmt.Errorf("failed to process customer details: %w", err)
		}

		orderNumber, err := s.repo.GetNextOrderNumber(ctx)
		if err != nil {
			return fmt.Errorf("failed to generate order sequence number: %w", err)
		}

		var totalAmount float64
		var orderItems []model.OrderItem

		for _, item := range cart.Items {
			if !item.Product.IsActive {
				return fmt.Errorf("product '%s' is no longer active", item.Product.Name)
			}

			// Atomic inventory stock allocation check with row lock
			refID := fmt.Sprintf("ORDER-%s", orderNumber)
			notes := fmt.Sprintf("Reserved for customer order %s", orderNumber)
			if err := s.invService.AllocateStockTx(ctx, tx, item.ProductID, item.Quantity, refID, notes); err != nil {
				return fmt.Errorf("failed to allocate stock for product '%s': %w", item.Product.Name, err)
			}

			lineSubtotal := float64(item.Quantity) * item.Product.SellingPrice
			totalAmount += lineSubtotal

			orderItems = append(orderItems, model.OrderItem{
				ProductID:   item.ProductID,
				ProductSKU:  item.Product.SKU,
				ProductName: item.Product.Name,
				UnitPrice:   item.Product.SellingPrice,
				Quantity:    item.Quantity,
				Subtotal:    lineSubtotal,
			})
		}

		order := &model.Order{
			OrderNumber:     orderNumber,
			CustomerID:      customer.ID,
			Status:          "PENDING",
			TotalAmount:     totalAmount,
			DeliveryAddress: req.DeliveryAddress,
			CustomerNotes:   req.CustomerNotes,
			Items:           orderItems,
			StatusHistory: []model.OrderStatusHistory{
				{
					NewStatus: "PENDING",
					Notes:     "Order submitted through checkout",
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

	s.auditService.LogAction(ctx, nil, "CHECKOUT_ORDER", "orders", freshOrder.ID, nil, freshOrder, ip, ua)

	return s.formatOrderResponse(freshOrder), nil
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

		// Transition logic
		switch newStatus {
		case "CONFIRMED":
			if oldStatus != "PENDING" {
				return fmt.Errorf("cannot transition from %s to CONFIRMED", oldStatus)
			}
		case "PROCESSING":
			if oldStatus != "PENDING" && oldStatus != "CONFIRMED" {
				return fmt.Errorf("cannot transition from %s to PROCESSING", oldStatus)
			}
		case "COMPLETED":
			if oldStatus != "PROCESSING" && oldStatus != "CONFIRMED" {
				return fmt.Errorf("cannot transition from %s to COMPLETED", oldStatus)
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

	return s.formatOrderResponse(freshOrder), nil
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
	return s.whatsappService.GenerateOrderLink(order), nil
}

func (s *orderService) formatOrderResponse(o *model.Order) *dto.OrderResponse {
	var items []dto.OrderItemResponse
	for _, it := range o.Items {
		items = append(items, dto.OrderItemResponse{
			ID:          it.ID,
			ProductID:   it.ProductID,
			ProductSKU:  it.ProductSKU,
			ProductName: it.ProductName,
			UnitPrice:   it.UnitPrice,
			Quantity:    it.Quantity,
			Subtotal:    it.Subtotal,
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

	return &dto.OrderResponse{
		ID:              o.ID,
		OrderNumber:     o.OrderNumber,
		CustomerID:      o.CustomerID,
		CustomerName:    o.Customer.Name,
		CustomerPhone:   o.Customer.Phone,
		CustomerEmail:   o.Customer.Email,
		Status:          o.Status,
		TotalAmount:     o.TotalAmount,
		DeliveryAddress: o.DeliveryAddress,
		CustomerNotes:   o.CustomerNotes,
		InternalNotes:   o.InternalNotes,
		WhatsAppURL:     waURL,
		Items:           items,
		StatusHistory:   history,
		CreatedAt:       o.CreatedAt,
		UpdatedAt:       o.UpdatedAt,
	}
}
