package dto

import "time"

type CheckoutRequest struct {
	CustomerName    string `json:"customer_name" binding:"required,min=2,max=255"`
	CustomerPhone   string `json:"customer_phone" binding:"required,min=5,max=50"`
	CustomerEmail   string `json:"customer_email" binding:"omitempty,email"`
	DeliveryAddress string `json:"delivery_address" binding:"required"`
	CustomerNotes   string `json:"customer_notes"`
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status" binding:"required"` // PENDING, CONFIRMED, PROCESSING, COMPLETED, CANCELLED
	Notes  string `json:"notes"`
}

type OrderItemResponse struct {
	ID          string  `json:"id"`
	ProductID   string  `json:"product_id"`
	ProductSKU  string  `json:"product_sku"`
	ProductName string  `json:"product_name"`
	UnitPrice   float64 `json:"unit_price"`
	Quantity    int     `json:"quantity"`
	Subtotal    float64 `json:"subtotal"`
}

type OrderStatusHistoryResponse struct {
	ID             string    `json:"id"`
	PreviousStatus string    `json:"previous_status"`
	NewStatus      string    `json:"new_status"`
	ChangedByName  string    `json:"changed_by_name"`
	Notes          string    `json:"notes"`
	CreatedAt      time.Time `json:"created_at"`
}

type OrderResponse struct {
	ID              string                       `json:"id"`
	OrderNumber     string                       `json:"order_number"`
	CustomerID      string                       `json:"customer_id"`
	CustomerName    string                       `json:"customer_name"`
	CustomerPhone   string                       `json:"customer_phone"`
	CustomerEmail   string                       `json:"customer_email"`
	Status          string                       `json:"status"`
	TotalAmount     float64                      `json:"total_amount"`
	DeliveryAddress string                       `json:"delivery_address"`
	CustomerNotes   string                       `json:"customer_notes"`
	InternalNotes   string                       `json:"internal_notes"`
	WhatsAppURL     string                       `json:"whatsapp_url,omitempty"`
	Items           []OrderItemResponse          `json:"items"`
	StatusHistory   []OrderStatusHistoryResponse `json:"status_history"`
	CreatedAt       time.Time                    `json:"created_at"`
	UpdatedAt       time.Time                    `json:"updated_at"`
}
