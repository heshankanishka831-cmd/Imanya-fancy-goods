package model

import (
	"time"
)

type Supplier struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name          string    `gorm:"type:varchar(255);not null;unique" json:"name"`
	ContactPerson string    `gorm:"type:varchar(100)" json:"contact_person"`
	Email         string    `gorm:"type:varchar(255)" json:"email"`
	Phone         string    `gorm:"type:varchar(50)" json:"phone"`
	Address       string    `gorm:"type:text" json:"address"`
	IsActive      bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Supplier) TableName() string {
	return "suppliers"
}
