package model

import (
	"time"
)

type EmailOTPVerification struct {
	ID          string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Purpose     string     `gorm:"type:varchar(32);not null" json:"purpose"`
	Email       string     `gorm:"type:varchar(255);not null" json:"email"`
	UserID      *string    `gorm:"type:uuid" json:"user_id"`
	OTPHash     string     `gorm:"type:varchar(255);not null" json:"-"`
	PayloadJSON []byte     `gorm:"type:jsonb" json:"-"`
	Attempts    int        `gorm:"not null;default:0" json:"attempts"`
	MaxAttempts int        `gorm:"not null;default:5" json:"max_attempts"`
	ResendCount int        `gorm:"not null;default:0" json:"resend_count"`
	ExpiresAt   time.Time  `gorm:"not null" json:"expires_at"`
	LastSentAt  time.Time  `gorm:"not null;default:now()" json:"last_sent_at"`
	VerifiedAt  *time.Time `json:"verified_at"`
	ConsumedAt  *time.Time `json:"consumed_at"`
	RequestIP   string     `gorm:"type:varchar(64)" json:"request_ip"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

func (EmailOTPVerification) TableName() string {
	return "email_otp_verifications"
}
