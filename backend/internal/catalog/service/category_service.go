package service

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"distribution-management/internal/audit/service"
	"distribution-management/internal/catalog/dto"
	"distribution-management/internal/catalog/model"
	"distribution-management/internal/catalog/repository"
)

type CategoryService interface {
	Create(ctx context.Context, actorID string, req *dto.CategoryRequest, ip, ua string) (*dto.CategoryResponse, error)
	Update(ctx context.Context, actorID string, id int, req *dto.CategoryRequest, ip, ua string) (*dto.CategoryResponse, error)
	Delete(ctx context.Context, actorID string, id int, ip, ua string) error
	List(ctx context.Context, activeOnly bool) ([]dto.CategoryResponse, error)
	GetByID(ctx context.Context, id int) (*dto.CategoryResponse, error)
}

type categoryService struct {
	repo         repository.CategoryRepository
	auditService service.AuditService
}

func NewCategoryService(repo repository.CategoryRepository, auditService service.AuditService) CategoryService {
	return &categoryService{repo: repo, auditService: auditService}
}

func (s *categoryService) Create(ctx context.Context, actorID string, req *dto.CategoryRequest, ip, ua string) (*dto.CategoryResponse, error) {
	slug := generateSlug(req.Name)
	if existing, _ := s.repo.GetBySlug(ctx, slug); existing != nil {
		return nil, errors.New("a category with a similar name or slug already exists")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	category := &model.Category{
		Name:        req.Name,
		Slug:        slug,
		Description: req.Description,
		IsActive:    isActive,
	}

	if err := s.repo.Create(ctx, category); err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &actorID, "CREATE_CATEGORY", "categories", string(rune(category.ID)), nil, category, ip, ua)

	return toCategoryResponse(category), nil
}

func (s *categoryService) Update(ctx context.Context, actorID string, id int, req *dto.CategoryRequest, ip, ua string) (*dto.CategoryResponse, error) {
	category, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("category not found")
	}

	oldVal := *category

	category.Name = req.Name
	category.Slug = generateSlug(req.Name)
	category.Description = req.Description
	if req.IsActive != nil {
		category.IsActive = *req.IsActive
	}

	if err := s.repo.Update(ctx, category); err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &actorID, "UPDATE_CATEGORY", "categories", string(rune(category.ID)), oldVal, category, ip, ua)

	return toCategoryResponse(category), nil
}

func (s *categoryService) Delete(ctx context.Context, actorID string, id int, ip, ua string) error {
	hasProducts, err := s.repo.HasProducts(ctx, id)
	if err != nil {
		return err
	}
	if hasProducts {
		return errors.New("cannot delete this category because it contains active products. Please reassign or delete the products first")
	}

	category, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("category not found")
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	s.auditService.LogAction(ctx, &actorID, "DELETE_CATEGORY", "categories", string(rune(id)), category, nil, ip, ua)

	return nil
}

func (s *categoryService) List(ctx context.Context, activeOnly bool) ([]dto.CategoryResponse, error) {
	list, err := s.repo.List(ctx, activeOnly)
	if err != nil {
		return nil, err
	}

	var res []dto.CategoryResponse
	for _, c := range list {
		res = append(res, *toCategoryResponse(&c))
	}
	return res, nil
}

func (s *categoryService) GetByID(ctx context.Context, id int) (*dto.CategoryResponse, error) {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toCategoryResponse(c), nil
}

func generateSlug(s string) string {
	str := strings.ToLower(strings.TrimSpace(s))
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	str = reg.ReplaceAllString(str, "-")
	return strings.Trim(str, "-")
}

func toCategoryResponse(c *model.Category) *dto.CategoryResponse {
	return &dto.CategoryResponse{
		ID:          c.ID,
		Name:        c.Name,
		Slug:        c.Slug,
		Description: c.Description,
		IsActive:    c.IsActive,
		CreatedAt:   c.CreatedAt,
	}
}
