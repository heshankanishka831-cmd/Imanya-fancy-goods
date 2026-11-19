package dto

import "wholesale-management/internal/users/dto"

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterCustomerRequest struct {
	FirstName    string `json:"first_name" binding:"required"`
	LastName     string `json:"last_name" binding:"required"`
	Username     string `json:"username" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required,min=6"`
	Phone        string `json:"phone" binding:"required"`
	BusinessName string `json:"business_name"`
	Address      string `json:"address"`
}

type AuthResponse struct {
	Token        string           `json:"token"`
	TokenType    string           `json:"token_type"`
	ExpiresIn    int64            `json:"expires_in"` // seconds
	User         dto.UserResponse `json:"user"`
	BusinessName string           `json:"business_name,omitempty"`
	Phone        string           `json:"phone,omitempty"`
	Address      string           `json:"address,omitempty"`
}
