package handler

import (
	"net/http"
	"strconv"

	"wholesale-management/internal/platform/middleware"
	"wholesale-management/internal/platform/response"
	"wholesale-management/internal/procurement/dto"
	"wholesale-management/internal/procurement/service"

	"github.com/gin-gonic/gin"
)

type ProcurementHandler struct {
	procurementService service.ProcurementService
}

func NewProcurementHandler(procurementService service.ProcurementService) *ProcurementHandler {
	return &ProcurementHandler{procurementService: procurementService}
}

func (h *ProcurementHandler) CreatePO(c *gin.Context) {
	var req dto.CreatePORequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid purchase order payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	res, err := h.procurementService.CreatePO(c.Request.Context(), actorID, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, res)
}

func (h *ProcurementHandler) UpdatePOStatus(c *gin.Context) {
	id := c.Param("id")
	var req dto.POStatusUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid status payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	res, err := h.procurementService.UpdatePOStatus(c.Request.Context(), actorID, id, req.Status, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, res)
}

func (h *ProcurementHandler) CreateGoodsReceipt(c *gin.Context) {
	var req dto.CreateGoodsReceiptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid goods receipt payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	res, err := h.procurementService.CreateGoodsReceipt(c.Request.Context(), actorID, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, res)
}

func (h *ProcurementHandler) GetPO(c *gin.Context) {
	id := c.Param("id")
	res, err := h.procurementService.GetPOByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Purchase order not found")
		return
	}

	response.Success(c, http.StatusOK, res)
}

func (h *ProcurementHandler) ListPOs(c *gin.Context) {
	status := c.Query("status")
	supplierID := c.Query("supplier_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	list, total, err := h.procurementService.ListPOs(c.Request.Context(), status, supplierID, page, limit)
	if err != nil {
		response.InternalServerError(c, "Failed to load purchase orders")
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
