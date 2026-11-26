package handler

import (
	"net/http"
	"strconv"
	"strings"

	"distribution-management/internal/customers/dto"
	"distribution-management/internal/customers/service"
	"distribution-management/internal/platform/middleware"
	"distribution-management/internal/platform/response"

	"github.com/gin-gonic/gin"
)

type CustomerHandler struct {
	customerService service.CustomerService
}

func NewCustomerHandler(customerService service.CustomerService) *CustomerHandler {
	return &CustomerHandler{customerService: customerService}
}

// GetMyProfile godoc - Customer retrieves their own profile
func (h *CustomerHandler) GetMyProfile(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	res, err := h.customerService.GetProfileByUserID(c.Request.Context(), userID)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, res)
}

// UpdateMyProfile godoc - Customer updates their own permitted profile details
func (h *CustomerHandler) UpdateMyProfile(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req dto.CustomerProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid profile payload", err.Error())
		return
	}

	res, err := h.customerService.UpdateProfile(c.Request.Context(), userID, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		if strings.Contains(err.Error(), "already") {
			response.Error(c, http.StatusConflict, "CONFLICT", err.Error(), nil)
			return
		}
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, res)
}

// UploadMyProfilePhoto godoc - Customer uploads or replaces their own profile photo
func (h *CustomerHandler) UploadMyProfilePhoto(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	file, err := c.FormFile("photo")
	if err != nil {
		file, err = c.FormFile("image")
	}
	if err != nil || file == nil {
		response.BadRequest(c, "Please select an image file (JPG, PNG, or WebP) to upload")
		return
	}

	res, err := h.customerService.UploadProfilePhoto(c.Request.Context(), userID, file, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			response.NotFound(c, err.Error())
			return
		}
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, res)
}

// RemoveMyProfilePhoto godoc - Customer removes their own profile photo and restores default avatar
func (h *CustomerHandler) RemoveMyProfilePhoto(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	res, err := h.customerService.RemoveProfilePhoto(c.Request.Context(), userID, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			response.NotFound(c, err.Error())
			return
		}
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, res)
}

// ChangePassword godoc - Customer securely changes their password
func (h *CustomerHandler) ChangePassword(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req dto.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid password change payload", err.Error())
		return
	}

	if err := h.customerService.ChangePassword(c.Request.Context(), userID, &req, c.ClientIP(), c.Request.UserAgent()); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, gin.H{"message": "Password changed successfully"})
}

func mapEmailOTPStatus(c *gin.Context, err error) {
	msg := err.Error()
	lower := strings.ToLower(msg)
	switch {
	case strings.Contains(lower, "already"):
		response.Error(c, http.StatusConflict, "CONFLICT", msg, nil)
	case strings.Contains(lower, "please wait"):
		response.Error(c, http.StatusTooManyRequests, "COOLDOWN", msg, nil)
	case strings.Contains(lower, "unable to deliver"), strings.Contains(lower, "unable to resend"), strings.Contains(lower, "email service is not configured"):
		response.Error(c, http.StatusServiceUnavailable, "EMAIL_DELIVERY_FAILED", msg, nil)
	default:
		response.BadRequest(c, msg)
	}
}

// InitiateEmailChange godoc - Sends verification OTP to customer's new email without modifying active email yet
func (h *CustomerHandler) InitiateEmailChange(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req dto.InitiateEmailChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Please provide a valid new email address.", err.Error())
		return
	}

	challenge, err := h.customerService.InitiateEmailChange(c.Request.Context(), userID, &req, c.ClientIP())
	if err != nil {
		mapEmailOTPStatus(c, err)
		return
	}
	response.Success(c, http.StatusOK, challenge)
}

// VerifyEmailChange godoc - Verifies OTP and updates customer email + login username atomically
func (h *CustomerHandler) VerifyEmailChange(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req dto.VerifyEmailChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Please provide a valid 6-digit verification code.", err.Error())
		return
	}

	res, err := h.customerService.VerifyEmailChange(c.Request.Context(), userID, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		mapEmailOTPStatus(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// ResendEmailChangeOTP godoc - Resends email-change OTP with cooldown enforcement
func (h *CustomerHandler) ResendEmailChangeOTP(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req dto.ResendEmailChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid resend OTP payload", err.Error())
		return
	}

	challenge, err := h.customerService.ResendEmailChangeOTP(c.Request.Context(), userID, req.VerificationID)
	if err != nil {
		mapEmailOTPStatus(c, err)
		return
	}
	response.Success(c, http.StatusOK, challenge)
}

// GetCustomerByID godoc - Admin inspects complete customer dossier
func (h *CustomerHandler) GetCustomerByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.customerService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Customer not found")
		return
	}
	response.Success(c, http.StatusOK, res)
}

// List godoc - Admin lists customers with search, status filter, tier filter, and sorting
func (h *CustomerHandler) List(c *gin.Context) {
	search := c.Query("search")
	status := c.DefaultQuery("status", "all")
	tier := c.DefaultQuery("tier", "all")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	order := c.DefaultQuery("order", "DESC")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	filter := dto.CustomerFilter{
		Search: search,
		Status: status,
		Tier:   tier,
		SortBy: sortBy,
		Order:  order,
		Page:   page,
		Limit:  limit,
	}

	list, total, err := h.customerService.List(c.Request.Context(), filter)
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

// AdminUpdateCustomer godoc - Admin updates a customer profile
func (h *CustomerHandler) AdminUpdateCustomer(c *gin.Context) {
	actorID := middleware.GetCurrentUserID(c)
	id := c.Param("id")

	var req dto.AdminUpdateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid customer data", err.Error())
		return
	}

	res, err := h.customerService.AdminUpdate(c.Request.Context(), actorID, id, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, res)
}

// UpdateCustomerStatus godoc - Admin activates or deactivates customer account
func (h *CustomerHandler) UpdateCustomerStatus(c *gin.Context) {
	actorID := middleware.GetCurrentUserID(c)
	id := c.Param("id")

	var req dto.CustomerStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid status payload", err.Error())
		return
	}

	res, err := h.customerService.UpdateStatus(c.Request.Context(), actorID, id, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, res)
}

// AdminResetPassword godoc - Admin resets a customer's password
func (h *CustomerHandler) AdminResetPassword(c *gin.Context) {
	actorID := middleware.GetCurrentUserID(c)
	id := c.Param("id")

	var req dto.AdminResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid reset password payload", err.Error())
		return
	}

	if err := h.customerService.AdminResetPassword(c.Request.Context(), actorID, id, &req, c.ClientIP(), c.Request.UserAgent()); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, gin.H{"message": "Customer password reset successfully"})
}
