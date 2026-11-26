package handler

import (
	"net/http"
	"strconv"

	"distribution-management/internal/inventory/dto"
	"distribution-management/internal/inventory/service"
	"distribution-management/internal/platform/middleware"
	"distribution-management/internal/platform/response"

	"github.com/gin-gonic/gin"
)

type InventoryHandler struct {
	inventoryService service.InventoryService
}

func NewInventoryHandler(inventoryService service.InventoryService) *InventoryHandler {
	return &InventoryHandler{inventoryService: inventoryService}
}

func (h *InventoryHandler) AdjustStock(c *gin.Context) {
	var req dto.StockAdjustmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid stock adjustment request", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	if err := h.inventoryService.AdjustStock(c.Request.Context(), actorID, &req, c.ClientIP(), c.Request.UserAgent()); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Stock adjusted successfully"})
}

func (h *InventoryHandler) ListMovements(c *gin.Context) {
	productID := c.Query("product_id")
	movementType := c.Query("type")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	movements, total, err := h.inventoryService.ListMovements(c.Request.Context(), productID, movementType, page, limit)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve stock movements")
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	meta := response.PaginationMeta{
		CurrentPage: page,
		PerPage:     limit,
		TotalItems:  total,
		TotalPages:  totalPages,
	}

	response.SuccessWithMeta(c, http.StatusOK, movements, meta)
}

func (h *InventoryHandler) GetLowStock(c *gin.Context) {
	items, err := h.inventoryService.GetLowStockItems(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve low-stock alerts")
		return
	}
	response.Success(c, http.StatusOK, items)
}
