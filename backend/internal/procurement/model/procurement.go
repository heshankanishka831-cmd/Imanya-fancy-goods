package model

import (
	"time"

	catalogModel "distribution-management/internal/catalog/model"
	supplierModel "distribution-management/internal/suppliers/model"
	userModel "distribution-management/internal/users/model"
)

type PurchaseOrder struct {
	ID                   string              `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	PONumber             string              `gorm:"type:varchar(50);not null;unique" json:"po_number"`
	SupplierID           string              `gorm:"type:uuid;not null" json:"supplier_id"`
	Supplier             supplierModel.Supplier `gorm:"foreignKey:SupplierID" json:"supplier"`
	CreatedBy            string              `gorm:"type:uuid;not null" json:"created_by"`
	Creator              userModel.User      `gorm:"foreignKey:CreatedBy" json:"creator"`
	Status               string              `gorm:"type:varchar(32);not null;default:'DRAFT'" json:"status"` // DRAFT, ORDERED, PARTIALLY_RECEIVED, COMPLETED, CANCELLED
	TotalAmount          float64             `gorm:"type:numeric(12,2);not null;default:0.00" json:"total_amount"`
	ExpectedDeliveryDate *time.Time          `json:"expected_delivery_date"`
	Notes                string              `gorm:"type:text" json:"notes"`
	Items                []PurchaseOrderItem `gorm:"foreignKey:PurchaseOrderID;constraint:OnDelete:CASCADE" json:"items"`
	Receipts             []GoodsReceipt      `gorm:"foreignKey:PurchaseOrderID" json:"receipts"`
	CreatedAt            time.Time           `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time           `gorm:"autoUpdateTime" json:"updated_at"`
}

func (PurchaseOrder) TableName() string {
	return "purchase_orders"
}

type PurchaseOrderItem struct {
	ID               string               `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	PurchaseOrderID  string               `gorm:"type:uuid;not null" json:"purchase_order_id"`
	ProductID        string               `gorm:"type:uuid;not null" json:"product_id"`
	Product          catalogModel.Product `gorm:"foreignKey:ProductID" json:"product"`
	QuantityOrdered  int                  `gorm:"not null" json:"quantity_ordered"`
	QuantityReceived int                  `gorm:"not null;default:0" json:"quantity_received"`
	UnitCost         float64              `gorm:"type:numeric(12,2);not null" json:"unit_cost"`
	Subtotal         float64              `gorm:"type:numeric(12,2);not null" json:"subtotal"`
}

func (PurchaseOrderItem) TableName() string {
	return "purchase_order_items"
}

type GoodsReceipt struct {
	ID              string             `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ReceiptNumber   string             `gorm:"type:varchar(50);not null;unique" json:"receipt_number"`
	PurchaseOrderID string             `gorm:"type:uuid;not null" json:"purchase_order_id"`
	ReceivedBy      string             `gorm:"type:uuid;not null" json:"received_by"`
	Receiver        userModel.User     `gorm:"foreignKey:ReceivedBy" json:"receiver"`
	ReceivedAt      time.Time          `gorm:"autoCreateTime" json:"received_at"`
	Notes           string             `gorm:"type:text" json:"notes"`
	Items           []GoodsReceiptItem `gorm:"foreignKey:GoodsReceiptID;constraint:OnDelete:CASCADE" json:"items"`
}

func (GoodsReceipt) TableName() string {
	return "goods_receipts"
}

type GoodsReceiptItem struct {
	ID               string               `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	GoodsReceiptID   string               `gorm:"type:uuid;not null" json:"goods_receipt_id"`
	ProductID        string               `gorm:"type:uuid;not null" json:"product_id"`
	Product          catalogModel.Product `gorm:"foreignKey:ProductID" json:"product"`
	QuantityReceived int                  `gorm:"not null" json:"quantity_received"`
}

func (GoodsReceiptItem) TableName() string {
	return "goods_receipt_items"
}
