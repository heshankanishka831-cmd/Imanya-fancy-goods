package repository

import (
	"context"
	"strings"
	"time"

	"distribution-management/internal/otp/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type OTPRepository interface {
	Create(ctx context.Context, rec *model.EmailOTPVerification) error
	GetByID(ctx context.Context, id string) (*model.EmailOTPVerification, error)
	GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id string) (*model.EmailOTPVerification, error)
	GetLatestActiveByEmailAndPurpose(ctx context.Context, email, purpose string) (*model.EmailOTPVerification, error)
	ConsumeOtherActive(ctx context.Context, email, purpose, excludeID string, now time.Time) error
	IncrementAttempts(ctx context.Context, id string, lockAfterMax bool, maxAttempts int, now time.Time) error
	UpdateForResend(ctx context.Context, id, newOTPHash string, newExpiresAt, now time.Time) error
	MarkVerifiedAndConsumed(ctx context.Context, tx *gorm.DB, id string, now time.Time) error
}

type otpRepository struct {
	db *gorm.DB
}

func NewOTPRepository(db *gorm.DB) OTPRepository {
	return &otpRepository{db: db}
}

func (r *otpRepository) Create(ctx context.Context, rec *model.EmailOTPVerification) error {
	return r.db.WithContext(ctx).Create(rec).Error
}

func (r *otpRepository) GetByID(ctx context.Context, id string) (*model.EmailOTPVerification, error) {
	var rec model.EmailOTPVerification
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&rec).Error; err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *otpRepository) GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id string) (*model.EmailOTPVerification, error) {
	db := r.db
	if tx != nil {
		db = tx
	}
	var rec model.EmailOTPVerification
	if err := db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ?", id).
		First(&rec).Error; err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *otpRepository) GetLatestActiveByEmailAndPurpose(ctx context.Context, email, purpose string) (*model.EmailOTPVerification, error) {
	var rec model.EmailOTPVerification
	err := r.db.WithContext(ctx).
		Where("LOWER(email) = ? AND purpose = ? AND consumed_at IS NULL", strings.ToLower(strings.TrimSpace(email)), purpose).
		Order("created_at DESC").
		First(&rec).Error
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *otpRepository) ConsumeOtherActive(ctx context.Context, email, purpose, excludeID string, now time.Time) error {
	q := r.db.WithContext(ctx).
		Model(&model.EmailOTPVerification{}).
		Where("LOWER(email) = ? AND purpose = ? AND consumed_at IS NULL", strings.ToLower(strings.TrimSpace(email)), purpose)
	if excludeID != "" {
		q = q.Where("id <> ?", excludeID)
	}
	return q.Updates(map[string]interface{}{
		"consumed_at": now,
		"updated_at":  now,
	}).Error
}

func (r *otpRepository) IncrementAttempts(ctx context.Context, id string, lockAfterMax bool, maxAttempts int, now time.Time) error {
	updates := map[string]interface{}{
		"attempts":   gorm.Expr("attempts + 1"),
		"updated_at": now,
	}
	if lockAfterMax {
		updates["consumed_at"] = now
	}
	return r.db.WithContext(ctx).
		Model(&model.EmailOTPVerification{}).
		Where("id = ? AND consumed_at IS NULL", id).
		Updates(updates).Error
}

func (r *otpRepository) UpdateForResend(ctx context.Context, id, newOTPHash string, newExpiresAt, now time.Time) error {
	return r.db.WithContext(ctx).
		Model(&model.EmailOTPVerification{}).
		Where("id = ? AND consumed_at IS NULL", id).
		Updates(map[string]interface{}{
			"otp_hash":     newOTPHash,
			"expires_at":   newExpiresAt,
			"attempts":     0,
			"resend_count": gorm.Expr("resend_count + 1"),
			"last_sent_at": now,
			"updated_at":   now,
		}).Error
}

func (r *otpRepository) MarkVerifiedAndConsumed(ctx context.Context, tx *gorm.DB, id string, now time.Time) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	res := db.WithContext(ctx).
		Model(&model.EmailOTPVerification{}).
		Where("id = ? AND consumed_at IS NULL", id).
		Updates(map[string]interface{}{
			"verified_at": now,
			"consumed_at": now,
			"updated_at":  now,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
