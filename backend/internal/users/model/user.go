package model

import (
	"time"
)

type Role struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"type:varchar(50);not null;unique" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

func (Role) TableName() string {
	return "roles"
}

type User struct {
	ID           string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	RoleID       int       `gorm:"not null" json:"role_id"`
	Role         Role      `gorm:"foreignKey:RoleID" json:"role"`
	Username     string    `gorm:"type:varchar(100);not null;unique" json:"username"`
	Email        string    `gorm:"type:varchar(255);not null;unique" json:"email"`
	PasswordHash string    `gorm:"type:varchar(255);not null" json:"-"`
	FirstName     string    `gorm:"type:varchar(100);not null" json:"first_name"`
	LastName      string    `gorm:"type:varchar(100);not null" json:"last_name"`
	IsActive      bool      `gorm:"not null;default:true" json:"is_active"`
	EmailVerified bool      `gorm:"not null;default:false" json:"email_verified"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}
