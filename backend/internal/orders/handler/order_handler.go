package handler

import (
	"net/http"
	"strconv"

	customerService "wholesale-management/internal/customers/service"
	"wholesale-management/internal/orders/dto"
	"wholesale-management/internal/orders/repository"
	"wholesale-management/internal/orders/service"
	"wholesale-management/internal/platform/middleware"
	"wholesale-management/internal/platform/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type OrderHandler struct {
	orderService    service.OrderService
	customerService customerService.CustomerService
}

func NewOrderHandler(orderService service.OrderService, customerService customerService.CustomerService) *OrderHandler {
	return &OrderHandler{
		orderService:    orderService,
		customerService: customerService,
	}
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
		if err != nil || custProfile.ID != order.CustomerID {
			response.Forbidden(c, "You do not have access to view this order")
			return
		}
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

	filter := repository.OrderFilter{
		CustomerID: customerID,
		Status:     status,
		Search:     search,
		Limit:      limit,
		Offset:     (page - 1) * limit,
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
