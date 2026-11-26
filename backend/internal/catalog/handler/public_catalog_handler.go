package handler

import (
	"net/http"
	"strconv"

	"distribution-management/internal/catalog/repository"
	"distribution-management/internal/catalog/service"
	"distribution-management/internal/platform/response"

	"github.com/gin-gonic/gin"
)

type PublicCatalogHandler struct {
	productService  service.ProductService
	categoryService service.CategoryService
}

func NewPublicCatalogHandler(productService service.ProductService, categoryService service.CategoryService) *PublicCatalogHandler {
	return &PublicCatalogHandler{
		productService:  productService,
		categoryService: categoryService,
	}
}

func (h *PublicCatalogHandler) ListCategories(c *gin.Context) {
	categories, err := h.categoryService.List(c.Request.Context(), true) // active only
	if err != nil {
		response.InternalServerError(c, "Failed to load categories")
		return
	}
	response.Success(c, http.StatusOK, categories)
}

func (h *PublicCatalogHandler) ListProducts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "24"))
	categoryID, _ := strconv.Atoi(c.Query("category_id"))
	search := c.Query("search")

	filter := repository.ProductFilter{
		CategoryID: categoryID,
		Search:     search,
		ActiveOnly: true,
		Limit:      limit,
		Offset:     (page - 1) * limit,
	}

	products, total, err := h.productService.ListPublic(c.Request.Context(), filter)
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

	c.Header("Cache-Control", "no-store, no-cache, must-revalidate")
	c.Header("Pragma", "no-cache")
	response.SuccessWithMeta(c, http.StatusOK, products, meta)
}

func (h *PublicCatalogHandler) GetProduct(c *gin.Context) {
	id := c.Param("id")
	p, err := h.productService.GetPublicByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Product not found or currently unavailable")
		return
	}

	c.Header("Cache-Control", "no-store, no-cache, must-revalidate")
	c.Header("Pragma", "no-cache")
	response.Success(c, http.StatusOK, p)
}
