package handler

import (
	"net/http"
	"strconv"

	customerService "distribution-management/internal/customers/service"
	"distribution-management/internal/orders/dto"
	"distribution-management/internal/orders/repository"
	"distribution-management/internal/orders/service"
	"distribution-management/internal/platform/middleware"
	"distribution-management/internal/platform/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type OrderHandler struct {
	orderService       service.OrderService
	customerService    customerService.CustomerService
	webhookVerifyToken string
}

func NewOrderHandler(orderService service.OrderService, customerService customerService.CustomerService) *OrderHandler {
	return &OrderHandler{
		orderService:    orderService,
		customerService: customerService,
	}
}

func (h *OrderHandler) SetWebhookVerifyToken(token string) {
	h.webhookVerifyToken = token
}

func (h *OrderHandler) Checkout(c *gin.Context) {
	var req dto.CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid checkout payload", err.Error())
		return
	}

	sessionID := c.GetHeader("X-Session-ID")
	if sessionID == "" {
		sessionID = uuid.New().String()
		c.Header("X-Session-ID", sessionID)
	}

	userID := middleware.GetCurrentUserID(c)
	var customerIDOpt *string
	if userID != "" {
		customerIDOpt = &userID
	}

	order, err := h.orderService.Checkout(c.Request.Context(), sessionID, customerIDOpt, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, order)
}

func (h *OrderHandler) GuestCheckout(c *gin.Context) {
	var req dto.GuestCheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid guest checkout information", err.Error())
		return
	}

	sessionID := c.GetHeader("X-Session-ID")
	if sessionID == "" {
		sessionID = uuid.New().String()
		c.Header("X-Session-ID", sessionID)
	}

	order, err := h.orderService.GuestCheckout(c.Request.Context(), sessionID, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, order)
}

func (h *OrderHandler) GetGuestOrder(c *gin.Context) {
	orderNumber := c.Param("orderNumber")
	token := c.Query("token")
	phone := c.Query("phone")

	order, err := h.orderService.GetGuestOrder(c.Request.Context(), orderNumber, token, phone)
	if err != nil {
		if err.Error() == "order not found" {
			response.NotFound(c, "Order not found")
			return
		}
		response.Forbidden(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, order)
}

func (h *OrderHandler) RetryWhatsAppNotification(c *gin.Context) {
	id := c.Param("id")
	order, err := h.orderService.RetryWhatsAppNotification(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, order)
}

func (h *OrderHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid status payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	order, err := h.orderService.UpdateStatus(c.Request.Context(), actorID, id, req.Status, req.Notes, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, order)
}

func (h *OrderHandler) UpdatePaymentStatus(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdatePaymentStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid payment verification payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	order, err := h.orderService.UpdatePaymentStatus(c.Request.Context(), actorID, id, req.PaymentStatus, req.Notes, "ADMIN", c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, order)
}

func (h *OrderHandler) WhatsAppWebhookVerify(c *gin.Context) {
	if h.webhookVerifyToken == "" {
		response.Error(c, http.StatusServiceUnavailable, "WEBHOOK_NOT_CONFIGURED", "WhatsApp webhook verify token is not configured", nil)
		return
	}
	mode := c.Query("hub.mode")
	token := c.Query("hub.verify_token")
	challenge := c.Query("hub.challenge")
	if mode == "subscribe" && token == h.webhookVerifyToken {
		c.String(http.StatusOK, challenge)
		return
	}
	response.Forbidden(c, "Invalid webhook verification token")
}

func (h *OrderHandler) WhatsAppWebhookReceive(c *gin.Context) {
	if h.webhookVerifyToken == "" {
		response.Error(c, http.StatusServiceUnavailable, "WEBHOOK_NOT_CONFIGURED", "WhatsApp webhook is not configured", nil)
		return
	}

	var payload struct {
		Entry []struct {
			Changes []struct {
				Value struct {
					Messages []struct {
						From string `json:"from"`
						Text struct {
							Body string `json:"body"`
						} `json:"text"`
						Image struct {
							Caption string `json:"caption"`
						} `json:"image"`
						Document struct {
							Caption string `json:"caption"`
						} `json:"document"`
					} `json:"messages"`
				} `json:"value"`
			} `json:"changes"`
		} `json:"entry"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		response.BadRequest(c, "Invalid webhook payload", err.Error())
		return
	}

	for _, entry := range payload.Entry {
		for _, change := range entry.Changes {
			for _, msg := range change.Value.Messages {
				content := msg.Text.Body
				if content == "" {
					content = msg.Image.Caption
				}
				if content == "" {
					content = msg.Document.Caption
				}
				if content != "" {
					_, _, _ = h.orderService.RecordWhatsAppReceiptWebhook(c.Request.Context(), msg.From, content)
				}
			}
		}
	}

	response.Success(c, http.StatusOK, gin.H{"status": "received"})
}

func (h *OrderHandler) GetOrder(c *gin.Context) {
	id := c.Param("id")
	order, err := h.orderService.GetOrderByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Order not found")
		return
	}

	// Enforce ownership if requester is Customer
	userRole := middleware.GetCurrentRoleName(c)
	if userRole == "Customer" {
		userID := middleware.GetCurrentUserID(c)
		custProfile, err := h.customerService.GetProfileByUserID(c.Request.Context(), userID)
		if err != nil || order.CustomerID == nil || custProfile.ID != *order.CustomerID {
			response.Forbidden(c, "You do not have access to view this order")
			return
		}
	} else if userRole == "" {
		// Unauthenticated caller must provide matching guest token or phone
		token := c.Query("token")
		phone := c.Query("phone")
		if order.IsGuest {
			verified, err := h.orderService.GetGuestOrder(c.Request.Context(), order.OrderNumber, token, phone)
			if err != nil {
				response.Forbidden(c, "Verification token or phone number required to view guest order")
				return
			}
			response.Success(c, http.StatusOK, verified)
			return
		}
		response.Unauthorized(c, "Authentication required to view this order")
		return
	}

	response.Success(c, http.StatusOK, order)
}

func (h *OrderHandler) ListOrders(c *gin.Context) {
	status := c.Query("status")
	search := c.Query("search")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	customerID := c.Query("customer_id")
	userRole := middleware.GetCurrentRoleName(c)
	if userRole == "Customer" {
		userID := middleware.GetCurrentUserID(c)
		custProfile, err := h.customerService.GetProfileByUserID(c.Request.Context(), userID)
		if err != nil {
			response.Success(c, http.StatusOK, []interface{}{})
			return
		}
		customerID = custProfile.ID
	}

	var isGuestPtr *bool
	switch c.Query("customer_type") {
	case "guest":
		v := true
		isGuestPtr = &v
	case "registered":
		v := false
		isGuestPtr = &v
	}

	filter := repository.OrderFilter{
		CustomerID:    customerID,
		IsGuest:       isGuestPtr,
		Status:        status,
		PaymentStatus: c.Query("payment_status"),
		Search:        search,
		Limit:         limit,
		Offset:        (page - 1) * limit,
	}

	orders, total, err := h.orderService.ListOrders(c.Request.Context(), filter)
	if err != nil {
		response.InternalServerError(c, "Failed to load orders")
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	meta := response.PaginationMeta{
		CurrentPage: page,
		PerPage:     limit,
		TotalItems:  total,
		TotalPages:  totalPages,
	}

	response.SuccessWithMeta(c, http.StatusOK, orders, meta)
}

func (h *OrderHandler) GetWhatsAppLink(c *gin.Context) {
	id := c.Param("id")
	link, err := h.orderService.GetWhatsAppLink(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Order not found")
		return
	}

	response.Success(c, http.StatusOK, gin.H{"whatsapp_url": link})
}
