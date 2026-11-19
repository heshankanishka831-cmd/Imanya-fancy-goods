package repository

import (
	"context"
	"wholesale-management/internal/catalog/model"

	"gorm.io/gorm"
)

type CategoryRepository interface {
	GetByID(ctx context.Context, id int) (*model.Category, error)
	GetBySlug(ctx context.Context, slug string) (*model.Category, error)
	Create(ctx context.Context, category *model.Category) error
	Update(ctx context.Context, category *model.Category) error
	Delete(ctx context.Context, id int) error
	List(ctx context.Context, activeOnly bool) ([]model.Category, error)
	HasProducts(ctx context.Context, categoryID int) (bool, error)
}

type categoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) GetByID(ctx context.Context, id int) (*model.Category, error) {
	var c model.Category
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *categoryRepository) GetBySlug(ctx context.Context, slug string) (*model.Category, error) {
	var c model.Category
	err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *categoryRepository) Create(ctx context.Context, category *model.Category) error {
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *categoryRepository) Update(ctx context.Context, category *model.Category) error {
	return r.db.WithContext(ctx).Save(category).Error
}

func (r *categoryRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.Category{}, id).Error
}

func (r *categoryRepository) List(ctx context.Context, activeOnly bool) ([]model.Category, error) {
	var list []model.Category
	query := r.db.WithContext(ctx)
	if activeOnly {
		query = query.Where("is_active = ?", true)
	}
	err := query.Order("name ASC").Find(&list).Error
	return list, err
}

func (r *categoryRepository) HasProducts(ctx context.Context, categoryID int) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Table("products").Where("category_id = ?", categoryID).Count(&count).Error
	return count > 0, err
}
