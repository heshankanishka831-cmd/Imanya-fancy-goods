package model

import (
	"time"
)

type ProductStock struct {
	ProductID         string    `gorm:"type:uuid;primaryKey" json:"product_id"`
	CurrentStock      int       `gorm:"not null;default:0" json:"current_stock"`
	AllocatedStock    int       `gorm:"not null;default:0" json:"allocated_stock"`
	LowStockThreshold int       `gorm:"not null;default:5" json:"low_stock_threshold"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (ProductStock) TableName() string {
	return "product_stock"
}

// AvailableStock returns current_stock minus allocated_stock
func (s *ProductStock) AvailableStock() int {
	avail := s.CurrentStock - s.AllocatedStock
	if avail < 0 {
		return 0
	}
	return avail
}

type StockMovement struct {
	ID              string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProductID       string    `gorm:"type:uuid;not null" json:"product_id"`
	UserID          *string   `gorm:"type:uuid" json:"user_id"`
	MovementType    string    `gorm:"type:varchar(32);not null" json:"movement_type"` // RECEIVING, ORDER_ALLOCATION, ORDER_DEDUCTION, ADJUSTMENT, CANCELLATION_RESTOCK
	QuantityChanged int       `gorm:"not null" json:"quantity_changed"`
	QuantityBefore  int       `gorm:"not null" json:"quantity_before"`
	QuantityAfter   int       `gorm:"not null" json:"quantity_after"`
	ReferenceID     string    `gorm:"type:varchar(100)" json:"reference_id"`
	Notes           string    `gorm:"type:text" json:"notes"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (StockMovement) TableName() string {
	return "stock_movements"
}
