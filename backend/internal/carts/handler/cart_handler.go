package handler

import (
	"net/http"

	"wholesale-management/internal/carts/dto"
	"wholesale-management/internal/carts/service"
	"wholesale-management/internal/platform/middleware"
	"wholesale-management/internal/platform/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CartHandler struct {
	cartService service.CartService
}

func NewCartHandler(cartService service.CartService) *CartHandler {
	return &CartHandler{cartService: cartService}
}

func (h *CartHandler) getSessionOrUser(c *gin.Context) (string, *string) {
	sessionID := c.GetHeader("X-Session-ID")
	if sessionID == "" {
		sessionID = uuid.New().String()
		c.Header("X-Session-ID", sessionID)
	}

	userID := middleware.GetCurrentUserID(c)
	var customerID *string
	if userID != "" {
		customerID = &userID
	}

	return sessionID, customerID
}

func (h *CartHandler) GetCart(c *gin.Context) {
	sessionID, customerID := h.getSessionOrUser(c)
	cart, err := h.cartService.GetCart(c.Request.Context(), sessionID, customerID)
	if err != nil {
		response.InternalServerError(c, "Failed to load shopping cart")
		return
	}
	response.Success(c, http.StatusOK, cart)
}

func (h *CartHandler) AddItem(c *gin.Context) {
	var req dto.AddToCartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid cart item payload", err.Error())
		return
	}

	sessionID, customerID := h.getSessionOrUser(c)
	cart, err := h.cartService.AddItem(c.Request.Context(), sessionID, customerID, &req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, cart)
}

func (h *CartHandler) UpdateItem(c *gin.Context) {
	itemID := c.Param("itemId")
	var req dto.UpdateCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid quantity payload", err.Error())
		return
	}

	cart, err := h.cartService.UpdateItem(c.Request.Context(), itemID, req.Quantity)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, cart)
}

func (h *CartHandler) DeleteItem(c *gin.Context) {
	itemID := c.Param("itemId")
	if err := h.cartService.DeleteItem(c.Request.Context(), itemID); err != nil {
		response.BadRequest(c, "Failed to remove item from cart")
		return
	}
	response.Success(c, http.StatusOK, gin.H{"message": "Item removed from cart"})
}
