package dto

import "time"

type StockLevelResponse struct {
	ProductID         string    `json:"product_id"`
	ProductName       string    `json:"product_name"`
	SKU               string    `json:"sku"`
	CategoryName      string    `json:"category_name"`
	CurrentStock      int       `json:"current_stock"`
	AllocatedStock    int       `json:"allocated_stock"`
	AvailableStock    int       `json:"available_stock"`
	LowStockThreshold int       `json:"low_stock_threshold"`
	IsLowStock        bool      `json:"is_low_stock"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type StockAdjustmentRequest struct {
	ProductID       string `json:"product_id" binding:"required"`
	QuantityChanged int    `json:"quantity_changed" binding:"required"` // positive to add, negative to deduct
	Reason          string `json:"reason" binding:"required"`           // DAMAGE, COUNT_ERROR, RETURN, OTHER
	Notes           string `json:"notes"`
}

type StockMovementResponse struct {
	ID              string    `json:"id"`
	ProductID       string    `json:"product_id"`
	ProductName     string    `json:"product_name"`
	SKU             string    `json:"sku"`
	MovementType    string    `json:"movement_type"`
	QuantityChanged int       `json:"quantity_changed"`
	QuantityBefore  int       `json:"quantity_before"`
	QuantityAfter   int       `json:"quantity_after"`
	ReferenceID     string    `json:"reference_id"`
	Notes           string    `json:"notes"`
	CreatedAt       time.Time `json:"created_at"`
}
