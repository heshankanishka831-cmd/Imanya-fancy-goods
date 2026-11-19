package handler

import (
	"net/http"
	"strconv"

	"wholesale-management/internal/customers/dto"
	"wholesale-management/internal/customers/service"
	"wholesale-management/internal/platform/middleware"
	"wholesale-management/internal/platform/response"

	"github.com/gin-gonic/gin"
)

type CustomerHandler struct {
	customerService service.CustomerService
}

func NewCustomerHandler(customerService service.CustomerService) *CustomerHandler {
	return &CustomerHandler{customerService: customerService}
}

func (h *CustomerHandler) GetMyProfile(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	res, err := h.customerService.GetProfileByUserID(c.Request.Context(), userID)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, res)
}

func (h *CustomerHandler) UpdateMyProfile(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req dto.CustomerProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid profile payload", err.Error())
		return
	}

	res, err := h.customerService.UpdateProfile(c.Request.Context(), userID, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, res)
}

func (h *CustomerHandler) GetCustomerByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.customerService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Customer not found")
		return
	}
	response.Success(c, http.StatusOK, res)
}

func (h *CustomerHandler) List(c *gin.Context) {
	search := c.Query("search")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	list, total, err := h.customerService.List(c.Request.Context(), search, page, limit)
	if err != nil {
		response.InternalServerError(c, "Failed to load customers")
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
