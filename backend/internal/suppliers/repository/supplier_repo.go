package repository

import (
	"context"
	"wholesale-management/internal/suppliers/model"

	"gorm.io/gorm"
)

type SupplierRepository interface {
	GetByID(ctx context.Context, id string) (*model.Supplier, error)
	GetByName(ctx context.Context, name string) (*model.Supplier, error)
	Create(ctx context.Context, supplier *model.Supplier) error
	Update(ctx context.Context, supplier *model.Supplier) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, activeOnly bool, limit, offset int) ([]model.Supplier, int64, error)
	HasPurchaseOrders(ctx context.Context, supplierID string) (bool, error)
}

type supplierRepository struct {
	db *gorm.DB
}

func NewSupplierRepository(db *gorm.DB) SupplierRepository {
	return &supplierRepository{db: db}
}

func (r *supplierRepository) GetByID(ctx context.Context, id string) (*model.Supplier, error) {
	var s model.Supplier
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *supplierRepository) GetByName(ctx context.Context, name string) (*model.Supplier, error) {
	var s model.Supplier
	err := r.db.WithContext(ctx).Where("name = ?", name).First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *supplierRepository) Create(ctx context.Context, supplier *model.Supplier) error {
	return r.db.WithContext(ctx).Create(supplier).Error
}

func (r *supplierRepository) Update(ctx context.Context, supplier *model.Supplier) error {
	return r.db.WithContext(ctx).Save(supplier).Error
}

func (r *supplierRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&model.Supplier{}, "id = ?", id).Error
}

func (r *supplierRepository) List(ctx context.Context, activeOnly bool, limit, offset int) ([]model.Supplier, int64, error) {
	var list []model.Supplier
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Supplier{})
	if activeOnly {
		query = query.Where("is_active = ?", true)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("name ASC").Limit(limit).Offset(offset).Find(&list).Error
	return list, total, err
}

func (r *supplierRepository) HasPurchaseOrders(ctx context.Context, supplierID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Table("purchase_orders").Where("supplier_id = ?", supplierID).Count(&count).Error
	return count > 0, err
}
