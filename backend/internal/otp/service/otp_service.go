package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"distribution-management/internal/otp/model"
	"distribution-management/internal/otp/repository"
	"distribution-management/internal/platform/email"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	OTPExpiryDuration = 5 * time.Minute
	OTPExpiryMinutes  = 5
	ResendCooldown    = 60 * time.Second
	DefaultMaxAttempt = 5
	MaxResendsAllowed = 5
)

type OTPChallenge struct {
	VerificationID        string `json:"verification_id"`
	Email                 string `json:"email"`
	ExpiresInSeconds      int    `json:"expires_in_seconds"`
	ResendCooldownSeconds int    `json:"resend_cooldown_seconds"`
}

type IssueOTPParams struct {
	Purpose       string
	Email         string
	RecipientName string
	UserID        *string
	PayloadJSON   []byte
	RequestIP     string
}

type OTPService interface {
	IssueOTP(ctx context.Context, params IssueOTPParams) (*OTPChallenge, error)
	ResendOTP(ctx context.Context, verificationID, purpose, recipientName string) (*OTPChallenge, error)
	VerifyAndConsume(ctx context.Context, tx *gorm.DB, verificationID, email, purpose, otpCode string) (*model.EmailOTPVerification, error)
}

type otpService struct {
	repo        repository.OTPRepository
	emailSender email.EmailSender
	brandName   string
	nowFunc     func() time.Time
}

func NewOTPService(repo repository.OTPRepository, emailSender email.EmailSender, brandName string) OTPService {
	if strings.TrimSpace(brandName) == "" {
		brandName = "Imanya Fancy Goods"
	}
	return &otpService{
		repo:        repo,
		emailSender: emailSender,
		brandName:   brandName,
		nowFunc:     func() time.Time { return time.Now().UTC() },
	}
}

// GenerateSixDigitOTP produces a cryptographically secure 6-digit numeric OTP
func GenerateSixDigitOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func (s *otpService) IssueOTP(ctx context.Context, params IssueOTPParams) (*OTPChallenge, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(params.Email))
	if cleanEmail == "" || !strings.Contains(cleanEmail, "@") {
		return nil, errors.New("valid email address is required")
	}

	now := s.nowFunc()

	// Enforce resend cooldown against any active unconsumed verification for the same email & purpose
	if latest, err := s.repo.GetLatestActiveByEmailAndPurpose(ctx, cleanEmail, params.Purpose); err == nil && latest != nil {
		elapsed := now.Sub(latest.LastSentAt)
		if elapsed < ResendCooldown {
			waitSecs := int(ResendCooldown.Seconds() - elapsed.Seconds())
			if waitSecs < 1 {
				waitSecs = 1
			}
			return nil, fmt.Errorf("please wait %d seconds before requesting another verification code", waitSecs)
		}
	}

	otpCode, err := GenerateSixDigitOTP()
	if err != nil {
		return nil, errors.New("failed to generate secure verification code")
	}

	otpHash, err := bcrypt.GenerateFromPassword([]byte(otpCode), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to protect verification code")
	}

	subject, htmlBody, textBody := email.BuildOTPEmailContent(
		s.brandName,
		params.RecipientName,
		otpCode,
		params.Purpose,
		OTPExpiryMinutes,
	)

	// Send real email BEFORE committing OTP verification state so failed deliveries never persist dead records
	if err := s.emailSender.Send(ctx, cleanEmail, subject, htmlBody, textBody); err != nil {
		return nil, fmt.Errorf("unable to deliver verification email to %s: %w", cleanEmail, err)
	}

	rec := &model.EmailOTPVerification{
		ID:          uuid.New().String(),
		Purpose:     params.Purpose,
		Email:       cleanEmail,
		UserID:      params.UserID,
		OTPHash:     string(otpHash),
		PayloadJSON: params.PayloadJSON,
		Attempts:    0,
		MaxAttempts: DefaultMaxAttempt,
		ResendCount: 0,
		ExpiresAt:   now.Add(OTPExpiryDuration),
		LastSentAt:  now,
		RequestIP:   params.RequestIP,
	}

	if err := s.repo.Create(ctx, rec); err != nil {
		return nil, fmt.Errorf("failed to store email verification session: %w", err)
	}

	_ = s.repo.ConsumeOtherActive(ctx, cleanEmail, params.Purpose, rec.ID, now)

	return &OTPChallenge{
		VerificationID:        rec.ID,
		Email:                 cleanEmail,
		ExpiresInSeconds:      int(OTPExpiryDuration.Seconds()),
		ResendCooldownSeconds: int(ResendCooldown.Seconds()),
	}, nil
}

func (s *otpService) ResendOTP(ctx context.Context, verificationID, purpose, recipientName string) (*OTPChallenge, error) {
	if strings.TrimSpace(verificationID) == "" {
		return nil, errors.New("verification session ID is required")
	}

	rec, err := s.repo.GetByID(ctx, verificationID)
	if err != nil || rec == nil {
		return nil, errors.New("verification session not found. Please start again")
	}

	if rec.Purpose != purpose {
		return nil, errors.New("invalid verification session purpose")
	}

	if rec.ConsumedAt != nil || rec.VerifiedAt != nil {
		return nil, errors.New("this verification session is no longer active. Please submit your details again")
	}

	now := s.nowFunc()
	elapsed := now.Sub(rec.LastSentAt)
	if elapsed < ResendCooldown {
		waitSecs := int(ResendCooldown.Seconds() - elapsed.Seconds())
		if waitSecs < 1 {
			waitSecs = 1
		}
		return nil, fmt.Errorf("please wait %d seconds before resending the OTP", waitSecs)
	}

	if rec.ResendCount >= MaxResendsAllowed {
		return nil, errors.New("maximum OTP resend limit reached for this session. Please restart verification")
	}

	otpCode, err := GenerateSixDigitOTP()
	if err != nil {
		return nil, errors.New("failed to generate secure verification code")
	}

	otpHash, err := bcrypt.GenerateFromPassword([]byte(otpCode), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to protect verification code")
	}

	subject, htmlBody, textBody := email.BuildOTPEmailContent(
		s.brandName,
		recipientName,
		otpCode,
		rec.Purpose,
		OTPExpiryMinutes,
	)

	if err := s.emailSender.Send(ctx, rec.Email, subject, htmlBody, textBody); err != nil {
		return nil, fmt.Errorf("unable to resend verification email to %s: %w", rec.Email, err)
	}

	newExpires := now.Add(OTPExpiryDuration)
	if err := s.repo.UpdateForResend(ctx, rec.ID, string(otpHash), newExpires, now); err != nil {
		return nil, fmt.Errorf("failed to refresh verification session: %w", err)
	}

	return &OTPChallenge{
		VerificationID:        rec.ID,
		Email:                 rec.Email,
		ExpiresInSeconds:      int(OTPExpiryDuration.Seconds()),
		ResendCooldownSeconds: int(ResendCooldown.Seconds()),
	}, nil
}

func (s *otpService) VerifyAndConsume(ctx context.Context, tx *gorm.DB, verificationID, emailAddr, purpose, otpCode string) (*model.EmailOTPVerification, error) {
	cleanID := strings.TrimSpace(verificationID)
	cleanEmail := strings.ToLower(strings.TrimSpace(emailAddr))
	cleanOTP := strings.TrimSpace(otpCode)

	if cleanID == "" {
		return nil, errors.New("verification session ID is required")
	}
	if len(cleanOTP) != 6 {
		return nil, errors.New("please enter the valid 6-digit verification code")
	}

	rec, err := s.repo.GetByID(ctx, cleanID)
	if err != nil || rec == nil {
		return nil, errors.New("verification session not found or invalid")
	}

	if rec.Purpose != purpose {
		return nil, errors.New("invalid verification purpose")
	}

	if cleanEmail == "" || !strings.EqualFold(rec.Email, cleanEmail) {
		return nil, errors.New("email address does not match this verification session")
	}

	if rec.ConsumedAt != nil || rec.VerifiedAt != nil {
		return nil, errors.New("this verification code has already been used or invalidated. Please request a new code")
	}

	now := s.nowFunc()
	if now.After(rec.ExpiresAt) {
		return nil, errors.New("verification code has expired. Please click Resend OTP to receive a new code")
	}

	if rec.Attempts >= rec.MaxAttempts {
		return nil, errors.New("too many incorrect OTP attempts. Please request a new verification code")
	}

	// Verify OTP hash BEFORE taking a FOR UPDATE row lock so failed-attempt counter increments never deadlock
	if err := bcrypt.CompareHashAndPassword([]byte(rec.OTPHash), []byte(cleanOTP)); err != nil {
		nextAttempts := rec.Attempts + 1
		lockOut := nextAttempts >= rec.MaxAttempts
		_ = s.repo.IncrementAttempts(ctx, rec.ID, lockOut, rec.MaxAttempts, now)
		if lockOut {
			return nil, errors.New("too many incorrect OTP attempts. This code is now locked—please request a new code")
		}
		remaining := rec.MaxAttempts - nextAttempts
		return nil, fmt.Errorf("invalid verification code. %d attempt(s) remaining", remaining)
	}

	// Acquire FOR UPDATE row lock inside tx to atomically guard against concurrent OTP reuse
	lockedRec, err := s.repo.GetByIDForUpdate(ctx, tx, cleanID)
	if err != nil || lockedRec == nil {
		return nil, errors.New("verification session not found or invalid")
	}
	if lockedRec.ConsumedAt != nil || lockedRec.VerifiedAt != nil {
		return nil, errors.New("this verification code has already been used or invalidated. Please request a new code")
	}
	if now.After(lockedRec.ExpiresAt) {
		return nil, errors.New("verification code has expired. Please click Resend OTP to receive a new code")
	}
	if lockedRec.Attempts >= lockedRec.MaxAttempts {
		return nil, errors.New("too many incorrect OTP attempts. Please request a new verification code")
	}

	if err := s.repo.MarkVerifiedAndConsumed(ctx, tx, lockedRec.ID, now); err != nil {
		return nil, errors.New("this verification code has already been consumed")
	}

	lockedRec.VerifiedAt = &now
	lockedRec.ConsumedAt = &now
	return lockedRec, nil
}
