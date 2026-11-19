package repository

import (
	"context"
	"wholesale-management/internal/customers/model"

	"gorm.io/gorm"
)

type CustomerRepository interface {
	GetByID(ctx context.Context, id string) (*model.Customer, error)
	GetByUserID(ctx context.Context, userID string) (*model.Customer, error)
	GetByPhone(ctx context.Context, phone string) (*model.Customer, error)
	Create(ctx context.Context, customer *model.Customer) error
	Update(ctx context.Context, customer *model.Customer) error
	List(ctx context.Context, search string, limit, offset int) ([]model.Customer, int64, error)
	GetOrderCount(ctx context.Context, customerID string) (int64, error)
}

type customerRepository struct {
	db *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) CustomerRepository {
	return &customerRepository{db: db}
}

func (r *customerRepository) GetByID(ctx context.Context, id string) (*model.Customer, error) {
	var c model.Customer
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *customerRepository) GetByUserID(ctx context.Context, userID string) (*model.Customer, error) {
	var c model.Customer
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *customerRepository) GetByPhone(ctx context.Context, phone string) (*model.Customer, error) {
	var c model.Customer
	err := r.db.WithContext(ctx).Where("phone = ?", phone).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *customerRepository) Create(ctx context.Context, customer *model.Customer) error {
	return r.db.WithContext(ctx).Create(customer).Error
}

func (r *customerRepository) Update(ctx context.Context, customer *model.Customer) error {
	return r.db.WithContext(ctx).Save(customer).Error
}

func (r *customerRepository) List(ctx context.Context, search string, limit, offset int) ([]model.Customer, int64, error) {
	var list []model.Customer
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Customer{})
	if search != "" {
		s := "%" + search + "%"
		query = query.Where("name ILIKE ? OR phone ILIKE ? OR business_name ILIKE ? OR email ILIKE ?", s, s, s, s)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&list).Error
	return list, total, err
}

func (r *customerRepository) GetOrderCount(ctx context.Context, customerID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Table("orders").Where("customer_id = ?", customerID).Count(&count).Error
	return count, err
}
