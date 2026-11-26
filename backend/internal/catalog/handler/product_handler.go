package handler

import (
	"net/http"
	"strconv"

	"distribution-management/internal/catalog/dto"
	"distribution-management/internal/catalog/repository"
	"distribution-management/internal/catalog/service"
	"distribution-management/internal/platform/middleware"
	"distribution-management/internal/platform/response"

	"github.com/gin-gonic/gin"
)

type ProductHandler struct {
	productService service.ProductService
}

func NewProductHandler(productService service.ProductService) *ProductHandler {
	return &ProductHandler{productService: productService}
}

func (h *ProductHandler) Create(c *gin.Context) {
	var req dto.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid product payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	p, err := h.productService.Create(c.Request.Context(), actorID, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, p)
}

func (h *ProductHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid product payload", err.Error())
		return
	}

	actorID := middleware.GetCurrentUserID(c)
	p, err := h.productService.Update(c.Request.Context(), actorID, id, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, p)
}

func (h *ProductHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	actorID := middleware.GetCurrentUserID(c)

	if err := h.productService.Delete(c.Request.Context(), actorID, id, c.ClientIP(), c.Request.UserAgent()); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

func (h *ProductHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	p, err := h.productService.GetAdminByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Product not found")
		return
	}

	response.Success(c, http.StatusOK, p)
}

func (h *ProductHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	categoryID, _ := strconv.Atoi(c.Query("category_id"))
	search := c.Query("search")
	activeOnly := c.Query("active") == "true"

	filter := repository.ProductFilter{
		CategoryID: categoryID,
		Search:     search,
		ActiveOnly: activeOnly,
		Limit:      limit,
		Offset:     (page - 1) * limit,
	}

	products, total, err := h.productService.ListAdmin(c.Request.Context(), filter)
	if err != nil {
		response.InternalServerError(c, "Failed to load products")
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	meta := response.PaginationMeta{
		CurrentPage: page,
		PerPage:     limit,
		TotalItems:  total,
		TotalPages:  totalPages,
	}

	response.SuccessWithMeta(c, http.StatusOK, products, meta)
}

func (h *ProductHandler) UploadImage(c *gin.Context) {
	id := c.Param("id")
	file, err := c.FormFile("image")
	if err != nil {
		response.BadRequest(c, "No image file uploaded", err.Error())
		return
	}

	isPrimary := c.PostForm("is_primary") == "true"
	actorID := middleware.GetCurrentUserID(c)

	imgResp, err := h.productService.UploadImage(c.Request.Context(), actorID, id, file, isPrimary, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, imgResp)
}

func (h *ProductHandler) DeleteImage(c *gin.Context) {
	id := c.Param("id")
	imageID := c.Param("imageId")
	actorID := middleware.GetCurrentUserID(c)

	if err := h.productService.DeleteImage(c.Request.Context(), actorID, id, imageID, c.ClientIP(), c.Request.UserAgent()); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Product image deleted successfully"})
}
