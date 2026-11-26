package repository

import (
	"context"
	"distribution-management/internal/catalog/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ProductFilter struct {
	CategoryID int
	Search     string
	ActiveOnly bool
	Limit      int
	Offset     int
}

type ProductRepository interface {
	GetByID(ctx context.Context, id string) (*model.Product, error)
	GetBySKU(ctx context.Context, sku string) (*model.Product, error)
	GetBySlug(ctx context.Context, slug string) (*model.Product, error)
	Create(ctx context.Context, tx *gorm.DB, product *model.Product) error
	Update(ctx context.Context, tx *gorm.DB, product *model.Product) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filter ProductFilter) ([]model.Product, int64, error)
	AddImage(ctx context.Context, image *model.ProductImage) error
	DeleteImage(ctx context.Context, imageID string) error
}

type productRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ProductRepository {
	return &productRepository{db: db}
}

func (r *productRepository) GetByID(ctx context.Context, id string) (*model.Product, error) {
	var p model.Product
	err := r.db.WithContext(ctx).
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, is_primary DESC")
		}).
		Preload("Stock").
		Where("id = ?", id).
		First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *productRepository) GetBySKU(ctx context.Context, sku string) (*model.Product, error) {
	var p model.Product
	err := r.db.WithContext(ctx).Where("sku = ?", sku).First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *productRepository) GetBySlug(ctx context.Context, slug string) (*model.Product, error) {
	var p model.Product
	err := r.db.WithContext(ctx).
		Preload("Category").
		Preload("Images").
		Preload("Stock").
		Where("slug = ?", slug).
		First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *productRepository) Create(ctx context.Context, tx *gorm.DB, product *model.Product) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(product).Error
}

func (r *productRepository) Update(ctx context.Context, tx *gorm.DB, product *model.Product) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Omit(clause.Associations).Save(product).Error
}

func (r *productRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&model.Product{}, "id = ?", id).Error
}

func (r *productRepository) List(ctx context.Context, filter ProductFilter) ([]model.Product, int64, error) {
	var products []model.Product
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Product{})

	if filter.ActiveOnly {
		query = query.Where("is_active = ?", true)
	}
	if filter.CategoryID > 0 {
		query = query.Where("category_id = ?", filter.CategoryID)
	}
	if filter.Search != "" {
		s := "%" + filter.Search + "%"
		query = query.Where("name ILIKE ? OR sku ILIKE ? OR description ILIKE ?", s, s, s)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, is_primary DESC")
		}).
		Preload("Stock").
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&products).Error

	return products, total, err
}

func (r *productRepository) AddImage(ctx context.Context, image *model.ProductImage) error {
	return r.db.WithContext(ctx).Create(image).Error
}

func (r *productRepository) DeleteImage(ctx context.Context, imageID string) error {
	return r.db.WithContext(ctx).Delete(&model.ProductImage{}, "id = ?", imageID).Error
}
