package dto

import "time"

type CategoryRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active"`
}

type CategoryResponse struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateProductRequest struct {
	CategoryID        int        `json:"category_id" binding:"required,gt=0"`
	SKU               string     `json:"sku" binding:"required,min=2,max=64"`
	Name              string     `json:"name" binding:"required,min=2,max=255"`
	Description       string     `json:"description"`
	UnitOfMeasure     string     `json:"unit_of_measure" binding:"required,max=32"`
	SellingPrice      float64    `json:"selling_price" binding:"required,gte=0"`
	CostPrice         float64    `json:"cost_price" binding:"gte=0"`
	InitialStock      int        `json:"initial_stock" binding:"gte=0"`
	LowStockThreshold int        `json:"low_stock_threshold" binding:"gte=0"`
	MinOrderQuantity  int        `json:"min_order_quantity" binding:"omitempty,gte=1"`
	IsDiscountEnabled *bool      `json:"is_discount_enabled"`
	DiscountPercent   float64    `json:"discount_percent" binding:"gte=0,lt=100"`
	DiscountStartDate *time.Time `json:"discount_start_date"`
	DiscountEndDate   *time.Time `json:"discount_end_date"`
	IsActive          *bool      `json:"is_active"`
}

type UpdateProductRequest struct {
	CategoryID        int        `json:"category_id" binding:"required,gt=0"`
	Name              string     `json:"name" binding:"required,min=2,max=255"`
	Description       string     `json:"description"`
	UnitOfMeasure     string     `json:"unit_of_measure" binding:"required,max=32"`
	SellingPrice      float64    `json:"selling_price" binding:"required,gte=0"`
	CostPrice         float64    `json:"cost_price" binding:"gte=0"`
	LowStockThreshold int        `json:"low_stock_threshold" binding:"gte=0"`
	MinOrderQuantity  int        `json:"min_order_quantity" binding:"omitempty,gte=1"`
	IsDiscountEnabled *bool      `json:"is_discount_enabled"`
	DiscountPercent   float64    `json:"discount_percent" binding:"gte=0,lt=100"`
	DiscountStartDate *time.Time `json:"discount_start_date"`
	DiscountEndDate   *time.Time `json:"discount_end_date"`
	IsActive          *bool      `json:"is_active"`
}

type ProductImageResponse struct {
	ID        string `json:"id"`
	ImageURL  string `json:"image_url"`
	AltText   string `json:"alt_text"`
	IsPrimary bool   `json:"is_primary"`
}

// ProductAdminResponse includes cost price, detailed stock figures, and discount management info
type ProductAdminResponse struct {
	ID                string                 `json:"id"`
	CategoryID        int                    `json:"category_id"`
	CategoryName      string                 `json:"category_name"`
	SKU               string                 `json:"sku"`
	Name              string                 `json:"name"`
	Slug              string                 `json:"slug"`
	Description       string                 `json:"description"`
	UnitOfMeasure     string                 `json:"unit_of_measure"`
	SellingPrice      float64                `json:"selling_price"`
	CostPrice         float64                `json:"cost_price"`
	MinOrderQuantity  int                    `json:"min_order_quantity"`
	IsDiscountEnabled bool                   `json:"is_discount_enabled"`
	DiscountPercent   float64                `json:"discount_percent"`
	DiscountStartDate *time.Time             `json:"discount_start_date"`
	DiscountEndDate   *time.Time             `json:"discount_end_date"`
	DiscountedPrice   float64                `json:"discounted_price"`
	DiscountAmount    float64                `json:"discount_amount"`
	IsDiscountActive  bool                   `json:"is_discount_active"`
	DiscountStatus    string                 `json:"discount_status"` // ACTIVE, SCHEDULED, EXPIRED, DISABLED
	CurrentStock      int                    `json:"current_stock"`
	AllocatedStock    int                    `json:"allocated_stock"`
	AvailableStock    int                    `json:"available_stock"`
	LowStockThreshold int                    `json:"low_stock_threshold"`
	IsLowStock        bool                   `json:"is_low_stock"`
	IsActive          bool                   `json:"is_active"`
	Images            []ProductImageResponse `json:"images"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
}

// ProductPublicResponse strictly hides cost prices and supplier references
type ProductPublicResponse struct {
	ID                string                 `json:"id"`
	CategoryID        int                    `json:"category_id"`
	CategoryName      string                 `json:"category_name"`
	SKU               string                 `json:"sku"`
	Name              string                 `json:"name"`
	Slug              string                 `json:"slug"`
	Description       string                 `json:"description"`
	UnitOfMeasure     string                 `json:"unit_of_measure"`
	SellingPrice      float64                `json:"selling_price"`
	MinOrderQuantity  int                    `json:"min_order_quantity"`
	IsDiscountEnabled bool                   `json:"is_discount_enabled"`
	IsDiscountActive  bool                   `json:"is_discount_active"`
	DiscountStatus    string                 `json:"discount_status"`
	DiscountPercent   float64                `json:"discount_percent"`
	DiscountedPrice   float64                `json:"discounted_price"`
	DiscountAmount    float64                `json:"discount_amount"`
	DiscountStartDate *time.Time             `json:"discount_start_date,omitempty"`
	DiscountEndDate   *time.Time             `json:"discount_end_date,omitempty"`
	InStock           bool                   `json:"in_stock"`
	AvailableStock    int                    `json:"available_stock"`
	Images            []ProductImageResponse `json:"images"`
}
