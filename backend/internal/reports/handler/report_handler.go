package handler

import (
	"net/http"

	"distribution-management/internal/platform/response"
	"distribution-management/internal/reports/service"

	"github.com/gin-gonic/gin"
)

type ReportHandler struct {
	reportService service.ReportService
}

func NewReportHandler(reportService service.ReportService) *ReportHandler {
	return &ReportHandler{reportService: reportService}
}

func (h *ReportHandler) GetDashboard(c *gin.Context) {
	metrics, err := h.reportService.GetDashboardMetrics(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to calculate dashboard statistics")
		return
	}
	response.Success(c, http.StatusOK, metrics)
}

func (h *ReportHandler) GetSalesReport(c *gin.Context) {
	period := c.DefaultQuery("period", "weekly")
	report, err := h.reportService.GetSalesReport(c.Request.Context(), period)
	if err != nil {
		response.InternalServerError(c, "Failed to generate sales report")
		return
	}
	response.Success(c, http.StatusOK, report)
}
