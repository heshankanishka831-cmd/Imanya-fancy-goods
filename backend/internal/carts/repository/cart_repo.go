package repository

import (
	"context"
	"wholesale-management/internal/carts/model"

	"gorm.io/gorm"
)

type CartRepository interface {
	GetBySessionOrCustomer(ctx context.Context, sessionID string, customerID *string) (*model.Cart, error)
	GetByID(ctx context.Context, id string) (*model.Cart, error)
	Create(ctx context.Context, cart *model.Cart) error
	AddItem(ctx context.Context, item *model.CartItem) error
	GetItem(ctx context.Context, cartID, productID string) (*model.CartItem, error)
	GetItemByID(ctx context.Context, itemID string) (*model.CartItem, error)
	UpdateItem(ctx context.Context, item *model.CartItem) error
	DeleteItem(ctx context.Context, itemID string) error
	ClearCart(ctx context.Context, tx *gorm.DB, cartID string) error
}

type cartRepository struct {
	db *gorm.DB
}

func NewCartRepository(db *gorm.DB) CartRepository {
	return &cartRepository{db: db}
}

func (r *cartRepository) GetBySessionOrCustomer(ctx context.Context, sessionID string, customerID *string) (*model.Cart, error) {
	var cart model.Cart
	query := r.db.WithContext(ctx).
		Preload("Items.Product.Images").
		Preload("Items.Product.Stock")

	if customerID != nil {
		query = query.Where("customer_id = ?", *customerID)
	} else {
		query = query.Where("session_id = ?", sessionID)
	}

	err := query.First(&cart).Error
	if err != nil {
		return nil, err
	}
	return &cart, nil
}

func (r *cartRepository) GetByID(ctx context.Context, id string) (*model.Cart, error) {
	var cart model.Cart
	err := r.db.WithContext(ctx).
		Preload("Items.Product.Images").
		Preload("Items.Product.Stock").
		Where("id = ?", id).
		First(&cart).Error
	if err != nil {
		return nil, err
	}
	return &cart, nil
}

func (r *cartRepository) Create(ctx context.Context, cart *model.Cart) error {
	return r.db.WithContext(ctx).Create(cart).Error
}

func (r *cartRepository) AddItem(ctx context.Context, item *model.CartItem) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *cartRepository) GetItem(ctx context.Context, cartID, productID string) (*model.CartItem, error) {
	var item model.CartItem
	err := r.db.WithContext(ctx).Where("cart_id = ? AND product_id = ?", cartID, productID).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *cartRepository) GetItemByID(ctx context.Context, itemID string) (*model.CartItem, error) {
	var item model.CartItem
	err := r.db.WithContext(ctx).Preload("Product.Stock").Where("id = ?", itemID).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *cartRepository) UpdateItem(ctx context.Context, item *model.CartItem) error {
	return r.db.WithContext(ctx).Save(item).Error
}

func (r *cartRepository) DeleteItem(ctx context.Context, itemID string) error {
	return r.db.WithContext(ctx).Delete(&model.CartItem{}, "id = ?", itemID).Error
}

func (r *cartRepository) ClearCart(ctx context.Context, tx *gorm.DB, cartID string) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Delete(&model.CartItem{}, "cart_id = ?", cartID).Error
}
