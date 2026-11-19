package model

import (
	"time"
	invModel "wholesale-management/internal/inventory/model"
)

type Product struct {
	ID            string                `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CategoryID    int                   `gorm:"not null" json:"category_id"`
	Category      Category              `gorm:"foreignKey:CategoryID" json:"category"`
	SKU           string                `gorm:"type:varchar(64);not null;unique" json:"sku"`
	Name          string                `gorm:"type:varchar(255);not null" json:"name"`
	Slug          string                `gorm:"type:varchar(280);not null;unique" json:"slug"`
	Description   string                `gorm:"type:text" json:"description"`
	UnitOfMeasure string                `gorm:"type:varchar(32);not null;default:'UNIT'" json:"unit_of_measure"`
	SellingPrice  float64               `gorm:"type:numeric(12,2);not null" json:"selling_price"`
	CostPrice     float64               `gorm:"type:numeric(12,2);not null;default:0.00" json:"cost_price"` // Confidential (Admin only)
	IsActive      bool                  `gorm:"not null;default:true" json:"is_active"`
	Images        []ProductImage        `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE" json:"images"`
	Stock         *invModel.ProductStock `gorm:"foreignKey:ProductID" json:"stock"`
	CreatedAt     time.Time             `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time             `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Product) TableName() string {
	return "products"
}

type ProductImage struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProductID string    `gorm:"type:uuid;not null" json:"product_id"`
	ImageURL  string    `gorm:"type:text;not null" json:"image_url"`
	AltText   string    `gorm:"type:varchar(255)" json:"alt_text"`
	IsPrimary bool      `gorm:"not null;default:false" json:"is_primary"`
	SortOrder int       `gorm:"not null;default:0" json:"sort_order"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (ProductImage) TableName() string {
	return "product_images"
}
