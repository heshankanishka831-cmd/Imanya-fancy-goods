package repository

import (
	"context"
	"fmt"
	"time"
	"wholesale-management/internal/procurement/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ProcurementRepository interface {
	CreatePO(ctx context.Context, tx *gorm.DB, po *model.PurchaseOrder) error
	GetPOByID(ctx context.Context, id string) (*model.PurchaseOrder, error)
	GetPOForUpdate(ctx context.Context, tx *gorm.DB, id string) (*model.PurchaseOrder, error)
	UpdatePO(ctx context.Context, tx *gorm.DB, po *model.PurchaseOrder) error
	ListPOs(ctx context.Context, status, supplierID string, limit, offset int) ([]model.PurchaseOrder, int64, error)
	CreateGoodsReceipt(ctx context.Context, tx *gorm.DB, gr *model.GoodsReceipt) error
	GetNextPONumber(ctx context.Context) (string, error)
	GetNextReceiptNumber(ctx context.Context) (string, error)
}

type procurementRepository struct {
	db *gorm.DB
}

func NewProcurementRepository(db *gorm.DB) ProcurementRepository {
	return &procurementRepository{db: db}
}

func (r *procurementRepository) CreatePO(ctx context.Context, tx *gorm.DB, po *model.PurchaseOrder) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(po).Error
}

func (r *procurementRepository) GetPOByID(ctx context.Context, id string) (*model.PurchaseOrder, error) {
	var po model.PurchaseOrder
	err := r.db.WithContext(ctx).
		Preload("Supplier").
		Preload("Creator").
		Preload("Items.Product").
		Preload("Receipts.Receiver").
		Preload("Receipts.Items.Product").
		Where("id = ?", id).
		First(&po).Error
	if err != nil {
		return nil, err
	}
	return &po, nil
}

func (r *procurementRepository) GetPOForUpdate(ctx context.Context, tx *gorm.DB, id string) (*model.PurchaseOrder, error) {
	db := r.db
	if tx != nil {
		db = tx
	}
	var po model.PurchaseOrder
	err := db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Items").
		Where("id = ?", id).
		First(&po).Error
	if err != nil {
		return nil, err
	}
	return &po, nil
}

func (r *procurementRepository) UpdatePO(ctx context.Context, tx *gorm.DB, po *model.PurchaseOrder) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Save(po).Error
}

func (r *procurementRepository) ListPOs(ctx context.Context, status, supplierID string, limit, offset int) ([]model.PurchaseOrder, int64, error) {
	var list []model.PurchaseOrder
	var total int64

	query := r.db.WithContext(ctx).Model(&model.PurchaseOrder{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if supplierID != "" {
		query = query.Where("supplier_id = ?", supplierID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.
		Preload("Supplier").
		Preload("Creator").
		Preload("Items.Product").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&list).Error

	return list, total, err
}

func (r *procurementRepository) CreateGoodsReceipt(ctx context.Context, tx *gorm.DB, gr *model.GoodsReceipt) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(gr).Error
}

func (r *procurementRepository) GetNextPONumber(ctx context.Context) (string, error) {
	var count int64
	err := r.db.WithContext(ctx).Table("purchase_orders").Count(&count).Error
	return fmt.Sprintf("PO-%s-%04d", time.Now().Format("20060102"), count+1), err
}

func (r *procurementRepository) GetNextReceiptNumber(ctx context.Context) (string, error) {
	var count int64
	err := r.db.WithContext(ctx).Table("goods_receipts").Count(&count).Error
	return fmt.Sprintf("GRN-%s-%04d", time.Now().Format("20060102"), count+1), err
}
