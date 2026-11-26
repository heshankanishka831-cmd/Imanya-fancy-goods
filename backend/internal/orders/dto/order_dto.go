package dto

import "time"

type CheckoutRequest struct {
	CustomerName    string `json:"customer_name" binding:"required,min=2,max=255"`
	CustomerPhone   string `json:"customer_phone" binding:"required,min=5,max=50"`
	CustomerEmail   string `json:"customer_email" binding:"omitempty,email"`
	DeliveryAddress string `json:"delivery_address" binding:"required"`
	CustomerNotes   string `json:"customer_notes"`
	IdempotencyKey  string `json:"idempotency_key" binding:"omitempty,max=128"`
}

type GuestCheckoutItemInput struct {
	ProductID string `json:"product_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
}

type GuestCheckoutRequest struct {
	FirstName            string                   `json:"first_name" binding:"required,min=1,max=100"`
	LastName             string                   `json:"last_name" binding:"required,min=1,max=100"`
	WhatsAppNumber       string                   `json:"whatsapp_number" binding:"required,min=9,max=30"`
	Email                string                   `json:"email" binding:"omitempty,email"`
	DeliveryAddress      string                   `json:"delivery_address" binding:"required,min=5,max=500"`
	City                 string                   `json:"city" binding:"required,min=2,max=120"`
	Province             string                   `json:"province" binding:"required,min=2,max=100"`
	PostalCode           string                   `json:"postal_code" binding:"omitempty,max=32"`
	DeliveryInstructions string                   `json:"delivery_instructions" binding:"omitempty,max=1000"`
	IdempotencyKey       string                   `json:"idempotency_key" binding:"omitempty,max=128"`
	Items                []GuestCheckoutItemInput `json:"items,omitempty"`
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status" binding:"required"` // PENDING, CONFIRMED, PROCESSING, COMPLETED, CANCELLED
	Notes  string `json:"notes"`
}

type UpdatePaymentStatusRequest struct {
	PaymentStatus string `json:"payment_status" binding:"required"` // PAYMENT_PENDING, RECEIPT_RECEIVED, PAYMENT_VERIFIED, PAYMENT_REJECTED
	Notes         string `json:"notes"`
}

type OrderItemResponse struct {
	ID              string   `json:"id"`
	ProductID       string   `json:"product_id"`
	ProductSKU      string   `json:"product_sku"`
	ProductName     string   `json:"product_name"`
	UnitOfMeasure   string   `json:"unit_of_measure,omitempty"`
	UnitPrice       float64  `json:"unit_price"`
	OriginalPrice   *float64 `json:"original_price,omitempty"`
	DiscountPercent float64  `json:"discount_percent,omitempty"`
	DiscountAmount  float64  `json:"discount_amount,omitempty"`
	Quantity        int      `json:"quantity"`
	Subtotal        float64  `json:"subtotal"`
}

type OrderStatusHistoryResponse struct {
	ID             string    `json:"id"`
	PreviousStatus string    `json:"previous_status"`
	NewStatus      string    `json:"new_status"`
	ChangedByName  string    `json:"changed_by_name"`
	Notes          string    `json:"notes"`
	CreatedAt      time.Time `json:"created_at"`
}

type OrderPaymentHistoryResponse struct {
	ID             string    `json:"id"`
	PreviousStatus string    `json:"previous_status"`
	NewStatus      string    `json:"new_status"`
	ChangedByName  string    `json:"changed_by_name"`
	Source         string    `json:"source"`
	Notes          string    `json:"notes"`
	CreatedAt      time.Time `json:"created_at"`
}

type OrderResponse struct {
	ID                         string                        `json:"id"`
	OrderNumber                string                        `json:"order_number"`
	CustomerID                 *string                       `json:"customer_id,omitempty"`
	IsGuest                    bool                          `json:"is_guest"`
	CustomerName               string                        `json:"customer_name"`
	CustomerPhone              string                        `json:"customer_phone"`
	CustomerEmail              string                        `json:"customer_email"`
	GuestCity                  string                        `json:"guest_city,omitempty"`
	GuestProvince              string                        `json:"guest_province,omitempty"`
	GuestPostalCode            string                        `json:"guest_postal_code,omitempty"`
	GuestAccessToken           string                        `json:"guest_access_token,omitempty"`
	Status                     string                        `json:"status"`
	PaymentStatus              string                        `json:"payment_status"`
	PaymentMethod              string                        `json:"payment_method"`
	PaymentNotes               string                        `json:"payment_notes,omitempty"`
	PaymentVerifiedAt          *time.Time                    `json:"payment_verified_at,omitempty"`
	TotalAmount                float64                       `json:"total_amount"`
	DeliveryAddress            string                        `json:"delivery_address"`
	CustomerNotes              string                        `json:"customer_notes"`
	InternalNotes              string                        `json:"internal_notes"`
	WhatsAppURL                string                        `json:"whatsapp_url,omitempty"`
	StoreWhatsAppNumber        string                        `json:"store_whatsapp_number,omitempty"`
	WhatsAppNotificationStatus string                        `json:"whatsapp_notification_status,omitempty"`
	WhatsAppNotificationError  string                        `json:"whatsapp_notification_error,omitempty"`
	Items                      []OrderItemResponse           `json:"items"`
	StatusHistory              []OrderStatusHistoryResponse  `json:"status_history"`
	PaymentHistory             []OrderPaymentHistoryResponse `json:"payment_history"`
	CreatedAt                  time.Time                     `json:"created_at"`
	UpdatedAt                  time.Time                     `json:"updated_at"`
}
