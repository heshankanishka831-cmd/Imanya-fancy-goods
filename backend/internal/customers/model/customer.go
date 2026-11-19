package model

import (
	"time"
	userModel "wholesale-management/internal/users/model"
)

type Customer struct {
	ID              string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID          *string         `gorm:"type:uuid;unique" json:"user_id"`
	User            *userModel.User `gorm:"foreignKey:UserID" json:"user"`
	Name            string          `gorm:"type:varchar(255);not null" json:"name"`
	Email           string          `gorm:"type:varchar(255)" json:"email"`
	Phone           string          `gorm:"type:varchar(50);not null" json:"phone"`
	BusinessName    string          `gorm:"type:varchar(255)" json:"business_name"`
	DeliveryAddress string          `gorm:"type:text" json:"delivery_address"`
	IsActive        bool            `gorm:"not null;default:true" json:"is_active"`
	CreatedAt       time.Time       `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time       `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Customer) TableName() string {
	return "customers"
}
