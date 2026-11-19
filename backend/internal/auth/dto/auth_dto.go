package dto

import "wholesale-management/internal/users/dto"

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token     string           `json:"token"`
	TokenType string           `json:"token_type"`
	ExpiresIn int64            `json:"expires_in"` // seconds
	User      dto.UserResponse `json:"user"`
}
