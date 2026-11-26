package model

import (
	"math"
	"time"

	invModel "distribution-management/internal/inventory/model"
)

type Product struct {
	ID                string                 `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CategoryID        int                    `gorm:"not null" json:"category_id"`
	Category          Category               `gorm:"foreignKey:CategoryID" json:"category"`
	SKU               string                 `gorm:"type:varchar(64);not null;unique" json:"sku"`
	Name              string                 `gorm:"type:varchar(255);not null" json:"name"`
	Slug              string                 `gorm:"type:varchar(280);not null;unique" json:"slug"`
	Description       string                 `gorm:"type:text" json:"description"`
	UnitOfMeasure     string                 `gorm:"type:varchar(32);not null;default:'UNIT'" json:"unit_of_measure"`
	SellingPrice      float64                `gorm:"type:numeric(12,2);not null" json:"selling_price"`
	CostPrice         float64                `gorm:"type:numeric(12,2);not null;default:0.00" json:"cost_price"` // Confidential (Admin only)
	MinOrderQuantity  int                    `gorm:"type:integer;not null;default:1" json:"min_order_quantity"`
	IsDiscountEnabled bool                   `gorm:"type:boolean;not null;default:false" json:"is_discount_enabled"`
	DiscountPercent   float64                `gorm:"type:numeric(5,2);not null;default:0.00" json:"discount_percent"`
	DiscountStartDate *time.Time             `gorm:"type:timestamptz" json:"discount_start_date"`
	DiscountEndDate   *time.Time             `gorm:"type:timestamptz" json:"discount_end_date"`
	IsActive          bool                   `gorm:"not null;default:true" json:"is_active"`
	Images            []ProductImage         `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE" json:"images"`
	Stock             *invModel.ProductStock `gorm:"foreignKey:ProductID" json:"stock"`
	CreatedAt         time.Time              `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time              `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Product) TableName() string {
	return "products"
}

// IsDiscountActive returns whether the discount is currently active based on toggle and optional date window
func (p *Product) IsDiscountActive(now time.Time) bool {
	if !p.IsDiscountEnabled || p.DiscountPercent <= 0 || p.DiscountPercent >= 100 {
		return false
	}
	if p.DiscountStartDate != nil && now.Before(*p.DiscountStartDate) {
		return false
	}
	if p.DiscountEndDate != nil && now.After(*p.DiscountEndDate) {
		return false
	}
	return true
}

// DiscountStatus returns administrative status of discount: "ACTIVE", "SCHEDULED", "EXPIRED", "DISABLED"
func (p *Product) DiscountStatus(now time.Time) string {
	if !p.IsDiscountEnabled || p.DiscountPercent <= 0 || p.DiscountPercent >= 100 {
		return "DISABLED"
	}
	if p.DiscountStartDate != nil && now.Before(*p.DiscountStartDate) {
		return "SCHEDULED"
	}
	if p.DiscountEndDate != nil && now.After(*p.DiscountEndDate) {
		return "EXPIRED"
	}
	return "ACTIVE"
}

// EffectivePrice computes authoritative price, savings, and active flag
// Formula:
// Discount Amount = Original Price * (Discount Percentage / 100)
// Discounted Price = Original Price - Discount Amount
func (p *Product) EffectivePrice(now time.Time) (effectivePrice float64, discountAmount float64, discountPercent float64, isActive bool) {
	if !p.IsDiscountActive(now) {
		return p.SellingPrice, 0, 0, false
	}
	discAmt := math.Round(p.SellingPrice*(p.DiscountPercent/100.0)*100) / 100
	effPrice := math.Round((p.SellingPrice-discAmt)*100) / 100
	if effPrice <= 0 {
		return p.SellingPrice, 0, 0, false
	}
	return effPrice, discAmt, p.DiscountPercent, true
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
