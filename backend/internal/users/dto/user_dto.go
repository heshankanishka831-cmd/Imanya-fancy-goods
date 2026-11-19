package dto

import "time"

type UserResponse struct {
	ID        string    `json:"id"`
	RoleID    int       `json:"role_id"`
	RoleName  string    `json:"role_name"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateUserRequest struct {
	RoleID    int    `json:"role_id" binding:"required,gt=0"`
	Username  string `json:"username" binding:"required,min=3,max=100"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"first_name" binding:"required,max=100"`
	LastName  string `json:"last_name" binding:"required,max=100"`
}

type UpdateUserStatusRequest struct {
	IsActive bool `json:"is_active"`
}
