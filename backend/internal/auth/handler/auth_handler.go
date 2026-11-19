package handler

import (
	"net/http"

	"wholesale-management/internal/auth/dto"
	"wholesale-management/internal/auth/service"
	"wholesale-management/internal/platform/response"

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
