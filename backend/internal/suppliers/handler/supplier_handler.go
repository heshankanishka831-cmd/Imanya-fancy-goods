package handler

import (
	"net/http"
	"strconv"

	"wholesale-management/internal/platform/middleware"
	"wholesale-management/internal/platform/response"
	"wholesale-management/internal/suppliers/dto"
	"wholesale-management/internal/suppliers/service"

	"github.com/gin-gonic/gin"
)

type SupplierHandler struct {
	supplierService service.SupplierService
}

func NewSupplierHandler(supplierService service.SupplierService) *SupplierHandler {
	return &SupplierHandler{supplierService: supplierService}
}

func (h *SupplierHandler) Create(c *gin.Context) {
	var req dto.SupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid supplier payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	res, err := h.supplierService.Create(c.Request.Context(), actorID, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, res)
}

func (h *SupplierHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req dto.SupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid supplier payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	res, err := h.supplierService.Update(c.Request.Context(), actorID, id, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, res)
}

func (h *SupplierHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	actorID := middleware.GetCurrentUserID(c)

	if err := h.supplierService.Delete(c.Request.Context(), actorID, id, c.ClientIP(), c.Request.UserAgent()); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Supplier deleted successfully"})
}

func (h *SupplierHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.supplierService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Supplier not found")
		return
	}

	response.Success(c, http.StatusOK, res)
}

func (h *SupplierHandler) List(c *gin.Context) {
	activeOnly := c.Query("active") == "true"
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	list, total, err := h.supplierService.List(c.Request.Context(), activeOnly, page, limit)
	if err != nil {
		response.InternalServerError(c, "Failed to load suppliers")
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	meta := response.PaginationMeta{
		CurrentPage: page,
		PerPage:     limit,
		TotalItems:  total,
		TotalPages:  totalPages,
	}

	response.SuccessWithMeta(c, http.StatusOK, list, meta)
}
