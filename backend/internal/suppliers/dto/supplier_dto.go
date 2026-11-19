package dto

import "time"

type SupplierRequest struct {
	Name          string `json:"name" binding:"required,min=2,max=255"`
	ContactPerson string `json:"contact_person" binding:"max=100"`
	Email         string `json:"email" binding:"omitempty,email"`
	Phone         string `json:"phone" binding:"required,max=50"`
	Address       string `json:"address"`
	IsActive      *bool  `json:"is_active"`
}

type SupplierResponse struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	ContactPerson string    `json:"contact_person"`
	Email         string    `json:"email"`
	Phone         string    `json:"phone"`
	Address       string    `json:"address"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
}
