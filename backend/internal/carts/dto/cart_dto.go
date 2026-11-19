package dto

type AddToCartRequest struct {
	ProductID string `json:"product_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,gt=0"`
}

type UpdateCartItemRequest struct {
	Quantity int `json:"quantity" binding:"required,gt=0"`
}

type CartItemResponse struct {
	ID             string  `json:"id"`
	ProductID      string  `json:"product_id"`
	ProductName    string  `json:"product_name"`
	ProductSKU     string  `json:"product_sku"`
	ProductImage   string  `json:"product_image"`
	UnitOfMeasure  string  `json:"unit_of_measure"`
	UnitPrice      float64 `json:"unit_price"`
	Quantity       int     `json:"quantity"`
	Subtotal       float64 `json:"subtotal"`
	AvailableStock int     `json:"available_stock"`
}

type CartResponse struct {
	ID         string             `json:"id"`
	Items      []CartItemResponse `json:"items"`
	TotalItems int                `json:"total_items"`
	TotalAmount float64           `json:"total_amount"`
}
