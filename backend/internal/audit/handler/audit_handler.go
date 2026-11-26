package handler

import (
	"net/http"
	"strconv"

	"distribution-management/internal/audit/service"
	"distribution-management/internal/platform/response"

	"github.com/gin-gonic/gin"
)

type AuditHandler struct {
	auditService service.AuditService
}

func NewAuditHandler(auditService service.AuditService) *AuditHandler {
	return &AuditHandler{auditService: auditService}
}

func (h *AuditHandler) ListLogs(c *gin.Context) {
	entity := c.Query("entity")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	logs, total, err := h.auditService.ListLogs(c.Request.Context(), entity, page, limit)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve audit logs")
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	meta := response.PaginationMeta{
		CurrentPage: page,
		PerPage:     limit,
		TotalItems:  total,
		TotalPages:  totalPages,
	}

	response.SuccessWithMeta(c, http.StatusOK, logs, meta)
}
