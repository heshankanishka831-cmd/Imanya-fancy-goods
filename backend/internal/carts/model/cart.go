package model

import (
	"time"
	catalogModel "distribution-management/internal/catalog/model"
)

type Cart struct {
	ID         string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CustomerID *string    `gorm:"type:uuid" json:"customer_id"`
	SessionID  string     `gorm:"type:varchar(100);index" json:"session_id"`
	Items      []CartItem `gorm:"foreignKey:CartID;constraint:OnDelete:CASCADE" json:"items"`
	CreatedAt  time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Cart) TableName() string {
	return "carts"
}

type CartItem struct {
	ID        string               `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CartID    string               `gorm:"type:uuid;not null;uniqueIndex:uq_cart_product" json:"cart_id"`
	ProductID string               `gorm:"type:uuid;not null;uniqueIndex:uq_cart_product" json:"product_id"`
	Product   catalogModel.Product `gorm:"foreignKey:ProductID" json:"product"`
	Quantity  int                  `gorm:"not null" json:"quantity"`
	CreatedAt time.Time            `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time            `gorm:"autoUpdateTime" json:"updated_at"`
}

func (CartItem) TableName() string {
	return "cart_items"
}
