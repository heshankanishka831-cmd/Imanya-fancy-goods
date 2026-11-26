package dto

type AddToCartRequest struct {
	ProductID string `json:"product_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,gt=0"`
}

type UpdateCartItemRequest struct {
	Quantity int `json:"quantity" binding:"required,gt=0"`
}

type CartItemResponse struct {
	ID               string  `json:"id"`
	ProductID        string  `json:"product_id"`
	ProductName      string  `json:"product_name"`
	ProductSKU       string  `json:"product_sku"`
	ProductImage     string  `json:"product_image"`
	UnitOfMeasure    string  `json:"unit_of_measure"`
	OriginalPrice    float64 `json:"original_price"`
	UnitPrice        float64 `json:"unit_price"` // Effective discounted selling price
	DiscountPercent  float64 `json:"discount_percent"`
	DiscountAmount   float64 `json:"discount_amount"`
	IsDiscountActive bool    `json:"is_discount_active"`
	MinOrderQuantity int     `json:"min_order_quantity"`
	Quantity         int     `json:"quantity"`
	Subtotal         float64 `json:"subtotal"`
	AvailableStock   int     `json:"available_stock"`
}

type CartResponse struct {
	ID            string             `json:"id"`
	Items         []CartItemResponse `json:"items"`
	TotalItems    int                `json:"total_items"`
	TotalAmount   float64            `json:"total_amount"` // Effective payable amount
	OriginalTotal float64            `json:"original_total"`
	TotalSavings  float64            `json:"total_savings"`
}
