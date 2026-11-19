package repository

import (
	"context"
	"wholesale-management/internal/inventory/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type InventoryRepository interface {
	GetStock(ctx context.Context, productID string) (*model.ProductStock, error)
	GetStockForUpdate(ctx context.Context, tx *gorm.DB, productID string) (*model.ProductStock, error)
	SaveStock(ctx context.Context, tx *gorm.DB, stock *model.ProductStock) error
	CreateMovement(ctx context.Context, tx *gorm.DB, movement *model.StockMovement) error
	ListMovements(ctx context.Context, productID, movementType string, limit, offset int) ([]model.StockMovement, int64, error)
	GetLowStockItems(ctx context.Context) ([]model.ProductStock, error)
}

type inventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) InventoryRepository {
	return &inventoryRepository{db: db}
}

func (r *inventoryRepository) GetStock(ctx context.Context, productID string) (*model.ProductStock, error) {
	var stock model.ProductStock
	err := r.db.WithContext(ctx).Where("product_id = ?", productID).First(&stock).Error
	if err != nil {
		return nil, err
	}
	return &stock, nil
}

func (r *inventoryRepository) GetStockForUpdate(ctx context.Context, tx *gorm.DB, productID string) (*model.ProductStock, error) {
	db := r.db
	if tx != nil {
		db = tx
	}

	var stock model.ProductStock
	err := db.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("product_id = ?", productID).First(&stock).Error
	if err != nil {
		return nil, err
	}
	return &stock, nil
}

func (r *inventoryRepository) SaveStock(ctx context.Context, tx *gorm.DB, stock *model.ProductStock) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Save(stock).Error
}

func (r *inventoryRepository) CreateMovement(ctx context.Context, tx *gorm.DB, movement *model.StockMovement) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(movement).Error
}

func (r *inventoryRepository) ListMovements(ctx context.Context, productID, movementType string, limit, offset int) ([]model.StockMovement, int64, error) {
	var movements []model.StockMovement
	var total int64

	query := r.db.WithContext(ctx).Model(&model.StockMovement{})
	if productID != "" {
		query = query.Where("product_id = ?", productID)
	}
	if movementType != "" {
		query = query.Where("movement_type = ?", movementType)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&movements).Error
	return movements, total, err
}

func (r *inventoryRepository) GetLowStockItems(ctx context.Context) ([]model.ProductStock, error) {
	var stocks []model.ProductStock
	err := r.db.WithContext(ctx).Where("(current_stock - allocated_stock) <= low_stock_threshold").Find(&stocks).Error
	return stocks, err
}
