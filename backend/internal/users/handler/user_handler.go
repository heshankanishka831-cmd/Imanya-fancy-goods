package handler

import (
	"net/http"
	"strconv"

	"distribution-management/internal/platform/middleware"
	"distribution-management/internal/platform/response"
	"distribution-management/internal/users/dto"
	"distribution-management/internal/users/service"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userService service.UserService
}

func NewUserHandler(userService service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var req dto.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid user creation payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	user, err := h.userService.CreateUser(c.Request.Context(), actorID, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, user)
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	users, total, err := h.userService.ListUsers(c.Request.Context(), page, limit)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve user list")
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	meta := response.PaginationMeta{
		CurrentPage: page,
		PerPage:     limit,
		TotalItems:  total,
		TotalPages:  totalPages,
	}

	response.SuccessWithMeta(c, http.StatusOK, users, meta)
}

func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")
	user, err := h.userService.GetUserByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}

	response.Success(c, http.StatusOK, user)
}

func (h *UserHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateUserStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid status update payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	if err := h.userService.UpdateUserStatus(c.Request.Context(), actorID, id, req.IsActive, c.ClientIP(), c.Request.UserAgent()); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "User status updated successfully"})
}

func (h *UserHandler) GetRoles(c *gin.Context) {
	roles, err := h.userService.GetRoles(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to fetch roles")
		return
	}
	response.Success(c, http.StatusOK, roles)
}
