package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
	"distribution-management/internal/orders/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type OrderFilter struct {
	CustomerID    string
	IsGuest       *bool
	Status        string
	PaymentStatus string
	Search        string
	Limit         int
	Offset        int
}

type OrderRepository interface {
	CreateOrder(ctx context.Context, tx *gorm.DB, order *model.Order) error
	GetOrderByID(ctx context.Context, id string) (*model.Order, error)
	GetOrderByNumber(ctx context.Context, orderNumber string) (*model.Order, error)
	GetOrderByIdempotencyKey(ctx context.Context, key string) (*model.Order, error)
	GetOrderForUpdate(ctx context.Context, tx *gorm.DB, id string) (*model.Order, error)
	UpdateOrder(ctx context.Context, tx *gorm.DB, order *model.Order) error
	UpdateWhatsAppNotification(ctx context.Context, orderID, status, errMsg string) error
	AddStatusHistory(ctx context.Context, tx *gorm.DB, history *model.OrderStatusHistory) error
	AddPaymentHistory(ctx context.Context, tx *gorm.DB, history *model.OrderPaymentHistory) error
	ListOrders(ctx context.Context, filter OrderFilter) ([]model.Order, int64, error)
	GetNextOrderNumber(ctx context.Context) (string, error)
}

type orderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) OrderRepository {
	return &orderRepository{db: db}
}

func (r *orderRepository) CreateOrder(ctx context.Context, tx *gorm.DB, order *model.Order) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(order).Error
}

func (r *orderRepository) GetOrderByID(ctx context.Context, id string) (*model.Order, error) {
	var o model.Order
	err := r.db.WithContext(ctx).
		Preload("Customer").
		Preload("Items").
		Preload("StatusHistory.Changer").
		Preload("PaymentHistory.Changer").
		Where("id = ?", id).
		First(&o).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *orderRepository) GetOrderForUpdate(ctx context.Context, tx *gorm.DB, id string) (*model.Order, error) {
	db := r.db
	if tx != nil {
		db = tx
	}
	var o model.Order
	err := db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Items").
		Where("id = ?", id).
		First(&o).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *orderRepository) UpdateOrder(ctx context.Context, tx *gorm.DB, order *model.Order) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Save(order).Error
}

func (r *orderRepository) AddStatusHistory(ctx context.Context, tx *gorm.DB, history *model.OrderStatusHistory) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(history).Error
}

func (r *orderRepository) AddPaymentHistory(ctx context.Context, tx *gorm.DB, history *model.OrderPaymentHistory) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(history).Error
}

func (r *orderRepository) GetOrderByNumber(ctx context.Context, orderNumber string) (*model.Order, error) {
	var o model.Order
	err := r.db.WithContext(ctx).
		Preload("Customer").
		Preload("Items").
		Preload("StatusHistory.Changer").
		Preload("PaymentHistory.Changer").
		Where("order_number = ?", orderNumber).
		First(&o).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *orderRepository) GetOrderByIdempotencyKey(ctx context.Context, key string) (*model.Order, error) {
	var o model.Order
	err := r.db.WithContext(ctx).
		Preload("Customer").
		Preload("Items").
		Preload("StatusHistory.Changer").
		Where("idempotency_key = ?", key).
		First(&o).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *orderRepository) UpdateWhatsAppNotification(ctx context.Context, orderID, status, errMsg string) error {
	return r.db.WithContext(ctx).Model(&model.Order{}).
		Where("id = ?", orderID).
		Updates(map[string]interface{}{
			"whatsapp_notification_status": status,
			"whatsapp_notification_error":  errMsg,
		}).Error
}

func (r *orderRepository) ListOrders(ctx context.Context, filter OrderFilter) ([]model.Order, int64, error) {
	var list []model.Order
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Order{})
	if filter.CustomerID != "" {
		query = query.Where("customer_id = ?", filter.CustomerID)
	}
	if filter.IsGuest != nil {
		query = query.Where("is_guest = ?", *filter.IsGuest)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.PaymentStatus != "" {
		query = query.Where("payment_status = ?", filter.PaymentStatus)
	}
	if filter.Search != "" {
		s := "%" + filter.Search + "%"
		query = query.Where("order_number ILIKE ? OR guest_name ILIKE ? OR guest_phone ILIKE ?", s, s, s)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.
		Preload("Customer").
		Preload("Items").
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&list).Error

	return list, total, err
}

func (r *orderRepository) GetNextOrderNumber(ctx context.Context) (string, error) {
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		var count int64
		_ = r.db.WithContext(ctx).Table("orders").Count(&count).Error
		return fmt.Sprintf("ORD-%s-%04d", time.Now().Format("20060102"), count+1), nil
	}
	suffix := hex.EncodeToString(b)
	return fmt.Sprintf("ORD-%s-%s", time.Now().Format("20060102"), suffix), nil
}
