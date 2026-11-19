package dto

import "time"

type CustomerProfileRequest struct {
	Name            string `json:"name" binding:"required,min=2,max=255"`
	Email           string `json:"email" binding:"omitempty,email"`
	Phone           string `json:"phone" binding:"required,min=5,max=50"`
	BusinessName    string `json:"business_name"`
	DeliveryAddress string `json:"delivery_address"`
}

type CustomerResponse struct {
	ID              string    `json:"id"`
	UserID          *string   `json:"user_id"`
	Name            string    `json:"name"`
	Email           string    `json:"email"`
	Phone           string    `json:"phone"`
	BusinessName    string    `json:"business_name"`
	DeliveryAddress string    `json:"delivery_address"`
	OrderCount      int64     `json:"order_count"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
}
