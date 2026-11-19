package dto

import "time"

type POItemRequest struct {
	ProductID       string  `json:"product_id" binding:"required"`
	QuantityOrdered int     `json:"quantity_ordered" binding:"required,gt=0"`
	UnitCost        float64 `json:"unit_cost" binding:"required,gte=0"`
}

type CreatePORequest struct {
	SupplierID           string          `json:"supplier_id" binding:"required"`
	ExpectedDeliveryDate *string         `json:"expected_delivery_date"`
	Notes                string          `json:"notes"`
	Items                []POItemRequest `json:"items" binding:"required,min=1,dive"`
}

type POStatusUpdateRequest struct {
	Status string `json:"status" binding:"required"` // DRAFT, ORDERED, CANCELLED
}

type GoodsReceiptItemRequest struct {
	ProductID        string `json:"product_id" binding:"required"`
	QuantityReceived int    `json:"quantity_received" binding:"required,gt=0"`
}

type CreateGoodsReceiptRequest struct {
	PurchaseOrderID string                    `json:"purchase_order_id" binding:"required"`
	Notes           string                    `json:"notes"`
	Items           []GoodsReceiptItemRequest `json:"items" binding:"required,min=1,dive"`
}

type POItemResponse struct {
	ID               string  `json:"id"`
	ProductID        string  `json:"product_id"`
	ProductName      string  `json:"product_name"`
	ProductSKU       string  `json:"product_sku"`
	QuantityOrdered  int     `json:"quantity_ordered"`
	QuantityReceived int     `json:"quantity_received"`
	UnitCost         float64 `json:"unit_cost"`
	Subtotal         float64 `json:"subtotal"`
}

type GoodsReceiptResponse struct {
	ID            string    `json:"id"`
	ReceiptNumber string    `json:"receipt_number"`
	ReceivedBy    string    `json:"received_by"`
	ReceiverName  string    `json:"receiver_name"`
	ReceivedAt    time.Time `json:"received_at"`
	Notes         string    `json:"notes"`
}

type POResponse struct {
	ID                   string                 `json:"id"`
	PONumber             string                 `json:"po_number"`
	SupplierID           string                 `json:"supplier_id"`
	SupplierName         string                 `json:"supplier_name"`
	CreatedBy            string                 `json:"created_by"`
	CreatorName          string                 `json:"creator_name"`
	Status               string                 `json:"status"`
	TotalAmount          float64                `json:"total_amount"`
	ExpectedDeliveryDate *time.Time             `json:"expected_delivery_date"`
	Notes                string                 `json:"notes"`
	Items                []POItemResponse       `json:"items"`
	Receipts             []GoodsReceiptResponse `json:"receipts"`
	CreatedAt            time.Time              `json:"created_at"`
	UpdatedAt            time.Time              `json:"updated_at"`
}
