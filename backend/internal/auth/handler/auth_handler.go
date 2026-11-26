package handler

import (
	"net/http"
	"strings"

	"distribution-management/internal/auth/dto"
	"distribution-management/internal/auth/service"
	"distribution-management/internal/platform/response"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid login credentials format", err.Error())
		return
	}

	authResp, err := h.authService.Login(c.Request.Context(), &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.Unauthorized(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, authResp)
}

// RegisterCustomer blocks legacy unverified direct registration to prevent OTP bypass
func (h *AuthHandler) RegisterCustomer(c *gin.Context) {
	response.BadRequest(c, "Email verification via OTP is required. Please complete verification via /api/v1/auth/customer/register/initiate.", nil)
}

func mapOTPErrorStatus(c *gin.Context, err error) {
	msg := err.Error()
	lower := strings.ToLower(msg)
	switch {
	case strings.Contains(lower, "already registered"):
		response.Error(c, http.StatusConflict, "CONFLICT", msg, nil)
	case strings.Contains(lower, "please wait"):
		response.Error(c, http.StatusTooManyRequests, "COOLDOWN", msg, nil)
	case strings.Contains(lower, "unable to deliver"), strings.Contains(lower, "unable to resend"), strings.Contains(lower, "email service is not configured"):
		response.Error(c, http.StatusServiceUnavailable, "EMAIL_DELIVERY_FAILED", msg, nil)
	default:
		response.BadRequest(c, msg, nil)
	}
}

func (h *AuthHandler) InitiateRegistration(c *gin.Context) {
	var req dto.RegisterCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Please complete all required registration fields accurately.", err.Error())
		return
	}

	challenge, err := h.authService.InitiateCustomerRegistration(c.Request.Context(), &req, c.ClientIP())
	if err != nil {
		mapOTPErrorStatus(c, err)
		return
	}

	response.Success(c, http.StatusOK, challenge)
}

func (h *AuthHandler) VerifyRegistrationOTP(c *gin.Context) {
	var req dto.VerifyRegistrationOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Please enter the valid 6-digit verification code.", err.Error())
		return
	}

	res, err := h.authService.VerifyCustomerRegistrationOTP(c.Request.Context(), &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		mapOTPErrorStatus(c, err)
		return
	}

	response.Success(c, http.StatusCreated, res)
}

func (h *AuthHandler) ResendRegistrationOTP(c *gin.Context) {
	var req dto.ResendRegistrationOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid resend OTP payload", err.Error())
		return
	}

	challenge, err := h.authService.ResendRegistrationOTP(c.Request.Context(), &req)
	if err != nil {
		mapOTPErrorStatus(c, err)
		return
	}

	response.Success(c, http.StatusOK, challenge)
}
