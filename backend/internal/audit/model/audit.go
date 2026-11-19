package model

import (
	"time"

	"gorm.io/datatypes"
)

type AuditLog struct {
	ID         string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID     *string        `gorm:"type:uuid" json:"user_id"`
	Action     string         `gorm:"type:varchar(64);not null" json:"action"`
	EntityName string         `gorm:"type:varchar(64);not null" json:"entity_name"`
	EntityID   string         `gorm:"type:varchar(100);not null" json:"entity_id"`
	OldValues  datatypes.JSON `gorm:"type:jsonb" json:"old_values"`
	NewValues  datatypes.JSON `gorm:"type:jsonb" json:"new_values"`
	IPAddress  string         `gorm:"type:varchar(45)" json:"ip_address"`
	UserAgent  string         `gorm:"type:text" json:"user_agent"`
	CreatedAt  time.Time      `gorm:"autoCreateTime" json:"created_at"`
}

func (AuditLog) TableName() string {
	return "audit_logs"
}
