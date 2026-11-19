package handler

import (
	"net/http"
	"strconv"

	"wholesale-management/internal/catalog/dto"
	"wholesale-management/internal/catalog/service"
	"wholesale-management/internal/platform/middleware"
	"wholesale-management/internal/platform/response"

	"github.com/gin-gonic/gin"
)

type CategoryHandler struct {
	categoryService service.CategoryService
}

func NewCategoryHandler(categoryService service.CategoryService) *CategoryHandler {
	return &CategoryHandler{categoryService: categoryService}
}

func (h *CategoryHandler) Create(c *gin.Context) {
	var req dto.CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid category payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	res, err := h.categoryService.Create(c.Request.Context(), actorID, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, res)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid category ID")
		return
	}

	var req dto.CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid category payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	res, err := h.categoryService.Update(c.Request.Context(), actorID, id, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, res)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid category ID")
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	if err := h.categoryService.Delete(c.Request.Context(), actorID, id, c.ClientIP(), c.Request.UserAgent()); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Category deleted successfully"})
}

func (h *CategoryHandler) List(c *gin.Context) {
	activeOnly := c.Query("active") == "true"
	list, err := h.categoryService.List(c.Request.Context(), activeOnly)
	if err != nil {
		response.InternalServerError(c, "Failed to load categories")
		return
	}

	response.Success(c, http.StatusOK, list)
}

func (h *CategoryHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid category ID")
		return
	}

	cat, err := h.categoryService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Category not found")
		return
	}

	response.Success(c, http.StatusOK, cat)
}
