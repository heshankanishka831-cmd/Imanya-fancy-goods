package model

import (
	"time"
)

type Category struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"type:varchar(100);not null;unique" json:"name"`
	Slug        string    `gorm:"type:varchar(120);not null;unique" json:"slug"`
	Description string    `gorm:"type:text" json:"description"`
	IsActive    bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Category) TableName() string {
	return "categories"
}
