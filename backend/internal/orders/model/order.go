package model

import (
	"time"

	customerModel "wholesale-management/internal/customers/model"
	userModel "wholesale-management/internal/users/model"
)

type Order struct {
	ID              string             `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OrderNumber     string             `gorm:"type:varchar(50);not null;unique" json:"order_number"`
	CustomerID      string             `gorm:"type:uuid;not null" json:"customer_id"`
	Customer        customerModel.Customer `gorm:"foreignKey:CustomerID" json:"customer"`
	Status          string             `gorm:"type:varchar(32);not null;default:'PENDING'" json:"status"` // PENDING, CONFIRMED, PROCESSING, COMPLETED, CANCELLED
	TotalAmount     float64            `gorm:"type:numeric(12,2);not null" json:"total_amount"`
	DeliveryAddress string             `gorm:"type:text" json:"delivery_address"`
	CustomerNotes   string             `gorm:"type:text" json:"customer_notes"`
	InternalNotes   string             `gorm:"type:text" json:"internal_notes"`
	Items           []OrderItem        `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"items"`
	StatusHistory   []OrderStatusHistory `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"status_history"`
	CreatedAt       time.Time          `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time          `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Order) TableName() string {
	return "orders"
}

type OrderItem struct {
	ID          string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OrderID     string  `gorm:"type:uuid;not null" json:"order_id"`
	ProductID   string  `gorm:"type:uuid;not null" json:"product_id"`
	ProductSKU  string  `gorm:"type:varchar(64);not null" json:"product_sku"`
	ProductName string  `gorm:"type:varchar(255);not null" json:"product_name"`
	UnitPrice   float64 `gorm:"type:numeric(12,2);not null" json:"unit_price"`
	Quantity    int     `gorm:"not null" json:"quantity"`
	Subtotal    float64 `gorm:"type:numeric(12,2);not null" json:"subtotal"`
}

func (OrderItem) TableName() string {
	return "order_items"
}

type OrderStatusHistory struct {
	ID             string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OrderID        string          `gorm:"type:uuid;not null" json:"order_id"`
	PreviousStatus string          `gorm:"type:varchar(32)" json:"previous_status"`
	NewStatus      string          `gorm:"type:varchar(32);not null" json:"new_status"`
	ChangedBy      *string         `gorm:"type:uuid" json:"changed_by"`
	Changer        *userModel.User `gorm:"foreignKey:ChangedBy" json:"changer"`
	Notes          string          `gorm:"type:text" json:"notes"`
	CreatedAt      time.Time       `gorm:"autoCreateTime" json:"created_at"`
}

func (OrderStatusHistory) TableName() string {
	return "order_status_history"
}
