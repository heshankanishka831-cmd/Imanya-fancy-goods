package service

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"testing"
	"time"

	"distribution-management/internal/otp/model"
	"distribution-management/internal/platform/email"

	"gorm.io/gorm"
)

type StubOTPRepo struct {
	records map[string]*model.EmailOTPVerification
}

func newStubOTPRepo() *StubOTPRepo {
	return &StubOTPRepo{records: make(map[string]*model.EmailOTPVerification)}
}

func (r *StubOTPRepo) Create(ctx context.Context, rec *model.EmailOTPVerification) error {
	copyRec := *rec
	r.records[rec.ID] = &copyRec
	return nil
}

func (r *StubOTPRepo) GetByID(ctx context.Context, id string) (*model.EmailOTPVerification, error) {
	rec, ok := r.records[id]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	copyRec := *rec
	return &copyRec, nil
}

func (r *StubOTPRepo) GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id string) (*model.EmailOTPVerification, error) {
	return r.GetByID(ctx, id)
}

func (r *StubOTPRepo) GetLatestActiveByEmailAndPurpose(ctx context.Context, emailAddr, purpose string) (*model.EmailOTPVerification, error) {
	var latest *model.EmailOTPVerification
	for _, rec := range r.records {
		if strings.EqualFold(rec.Email, emailAddr) && rec.Purpose == purpose && rec.ConsumedAt == nil {
			if latest == nil || rec.LastSentAt.After(latest.LastSentAt) {
				copyRec := *rec
				latest = &copyRec
			}
		}
	}
	if latest == nil {
		return nil, gorm.ErrRecordNotFound
	}
	return latest, nil
}

func (r *StubOTPRepo) ConsumeOtherActive(ctx context.Context, emailAddr, purpose, excludeID string, now time.Time) error {
	for id, rec := range r.records {
		if id != excludeID && strings.EqualFold(rec.Email, emailAddr) && rec.Purpose == purpose && rec.ConsumedAt == nil {
			t := now
			rec.ConsumedAt = &t
		}
	}
	return nil
}

func (r *StubOTPRepo) IncrementAttempts(ctx context.Context, id string, lockAfterMax bool, maxAttempts int, now time.Time) error {
	if rec, ok := r.records[id]; ok {
		rec.Attempts++
		if lockAfterMax {
			t := now
			rec.ConsumedAt = &t
		}
	}
	return nil
}

func (r *StubOTPRepo) UpdateForResend(ctx context.Context, id, newOTPHash string, newExpiresAt, now time.Time) error {
	if rec, ok := r.records[id]; ok {
		rec.OTPHash = newOTPHash
		rec.ExpiresAt = newExpiresAt
		rec.Attempts = 0
		rec.ResendCount++
		rec.LastSentAt = now
	}
	return nil
}

func (r *StubOTPRepo) MarkVerifiedAndConsumed(ctx context.Context, tx *gorm.DB, id string, now time.Time) error {
	rec, ok := r.records[id]
	if !ok || rec.ConsumedAt != nil {
		return gorm.ErrRecordNotFound
	}
	t := now
	rec.VerifiedAt = &t
	rec.ConsumedAt = &t
	return nil
}

type StubEmailSender struct {
	sentTo      []string
	sentText    []string
	failNextErr error
}

func (s *StubEmailSender) ValidateConfig() error { return s.failNextErr }

func (s *StubEmailSender) Send(ctx context.Context, to, subject, htmlBody, textBody string) error {
	if s.failNextErr != nil {
		return s.failNextErr
	}
	s.sentTo = append(s.sentTo, to)
	s.sentText = append(s.sentText, textBody)
	return nil
}

func extractOTPFromBody(body string) string {
	re := regexp.MustCompile(`\b(\d{6})\b`)
	m := re.FindStringSubmatch(body)
	if len(m) > 1 {
		return m[1]
	}
	return ""
}

func TestOTPService_LifecycleAndSecurity(t *testing.T) {
	ctx := context.Background()

	t.Run("Issues hashed OTP, delivers email, verifies once, and prevents reuse", func(t *testing.T) {
		repo := newStubOTPRepo()
		mailer := &StubEmailSender{}
		svc := NewOTPService(repo, mailer, "Imanya Fancy Goods").(*otpService)
		now := time.Date(2026, 11, 25, 10, 0, 0, 0, time.UTC)
		svc.nowFunc = func() time.Time { return now }

		challenge, err := svc.IssueOTP(ctx, IssueOTPParams{
			Purpose:       email.PurposeRegister,
			Email:         "Customer@Gmail.com",
			RecipientName: "Sunil Perera",
		})
		if err != nil {
			t.Fatalf("unexpected error issuing OTP: %v", err)
		}
		if challenge.Email != "customer@gmail.com" {
			t.Errorf("expected normalized lowercase email, got %s", challenge.Email)
		}
		if len(mailer.sentTo) != 1 || mailer.sentTo[0] != "customer@gmail.com" {
			t.Fatalf("expected email sent to normalized recipient, got %v", mailer.sentTo)
		}

		otpCode := extractOTPFromBody(mailer.sentText[0])
		if len(otpCode) != 6 {
			t.Fatalf("expected 6-digit OTP in email, got %q", otpCode)
		}

		// Verify stored OTP is hashed, never plaintext
		stored := repo.records[challenge.VerificationID]
		if stored.OTPHash == otpCode || strings.Contains(stored.OTPHash, otpCode) {
			t.Fatal("OTP must be securely hashed in storage")
		}

		// Wrong OTP increments attempts
		_, err = svc.VerifyAndConsume(ctx, nil, challenge.VerificationID, "customer@gmail.com", email.PurposeRegister, "000000")
		if err == nil {
			t.Fatal("expected incorrect OTP error")
		}
		if repo.records[challenge.VerificationID].Attempts != 1 {
			t.Errorf("expected attempts=1, got %d", repo.records[challenge.VerificationID].Attempts)
		}

		// Valid OTP succeeds
		verifiedRec, err := svc.VerifyAndConsume(ctx, nil, challenge.VerificationID, "customer@gmail.com", email.PurposeRegister, otpCode)
		if err != nil || verifiedRec == nil {
			t.Fatalf("expected valid OTP to verify, got err=%v", err)
		}

		// Reuse of the exact same OTP must fail
		_, err = svc.VerifyAndConsume(ctx, nil, challenge.VerificationID, "customer@gmail.com", email.PurposeRegister, otpCode)
		if err == nil {
			t.Fatal("expected reused OTP to be rejected")
		}
	})

	t.Run("Enforces 5-minute expiration", func(t *testing.T) {
		repo := newStubOTPRepo()
		mailer := &StubEmailSender{}
		svc := NewOTPService(repo, mailer, "Imanya Fancy Goods").(*otpService)
		now := time.Date(2026, 11, 25, 10, 0, 0, 0, time.UTC)
		svc.nowFunc = func() time.Time { return now }

		challenge, err := svc.IssueOTP(ctx, IssueOTPParams{
			Purpose: email.PurposeRegister,
			Email:   "expired@gmail.com",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		otpCode := extractOTPFromBody(mailer.sentText[0])

		// Advance clock past 5 minutes
		svc.nowFunc = func() time.Time { return now.Add(5*time.Minute + time.Second) }
		_, err = svc.VerifyAndConsume(ctx, nil, challenge.VerificationID, "expired@gmail.com", email.PurposeRegister, otpCode)
		if err == nil || !strings.Contains(strings.ToLower(err.Error()), "expired") {
			t.Fatalf("expected expired error, got %v", err)
		}
	})

	t.Run("Locks out after 5 incorrect attempts", func(t *testing.T) {
		repo := newStubOTPRepo()
		mailer := &StubEmailSender{}
		svc := NewOTPService(repo, mailer, "Imanya Fancy Goods").(*otpService)

		challenge, err := svc.IssueOTP(ctx, IssueOTPParams{
			Purpose: email.PurposeRegister,
			Email:   "lockout@gmail.com",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		correctOTP := extractOTPFromBody(mailer.sentText[0])
		wrongOTP := "999999"
		if correctOTP == wrongOTP {
			wrongOTP = "888888"
		}

		for i := 0; i < 5; i++ {
			_, err = svc.VerifyAndConsume(ctx, nil, challenge.VerificationID, "lockout@gmail.com", email.PurposeRegister, wrongOTP)
			if err == nil {
				t.Fatalf("expected failure on wrong attempt %d", i+1)
			}
		}

		// Even correct OTP must fail after 5 failed attempts
		_, err = svc.VerifyAndConsume(ctx, nil, challenge.VerificationID, "lockout@gmail.com", email.PurposeRegister, correctOTP)
		if err == nil {
			t.Fatal("expected locked session after max failed attempts")
		}
	})

	t.Run("Enforces resend cooldown and resets attempt counter cleanly", func(t *testing.T) {
		repo := newStubOTPRepo()
		mailer := &StubEmailSender{}
		svc := NewOTPService(repo, mailer, "Imanya Fancy Goods").(*otpService)
		now := time.Date(2026, 11, 25, 10, 0, 0, 0, time.UTC)
		svc.nowFunc = func() time.Time { return now }

		challenge, err := svc.IssueOTP(ctx, IssueOTPParams{
			Purpose: email.PurposeRegister,
			Email:   "resend@gmail.com",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Immediate resend rejected by cooldown
		_, err = svc.ResendOTP(ctx, challenge.VerificationID, email.PurposeRegister, "Resend User")
		if err == nil || !strings.Contains(strings.ToLower(err.Error()), "wait") {
			t.Fatalf("expected cooldown error, got %v", err)
		}

		// Advance 61s -> resend succeeds and issues new OTP
		svc.nowFunc = func() time.Time { return now.Add(61 * time.Second) }
		res2, err := svc.ResendOTP(ctx, challenge.VerificationID, email.PurposeRegister, "Resend User")
		if err != nil {
			t.Fatalf("expected resend after cooldown to succeed, got %v", err)
		}
		newOTP := extractOTPFromBody(mailer.sentText[1])
		_, err = svc.VerifyAndConsume(ctx, nil, res2.VerificationID, "resend@gmail.com", email.PurposeRegister, newOTP)
		if err != nil {
			t.Fatalf("expected fresh resent OTP to verify, got %v", err)
		}
	})

	t.Run("SMTP delivery failure does not create stored active OTP session", func(t *testing.T) {
		repo := newStubOTPRepo()
		mailer := &StubEmailSender{failNextErr: errors.New("SMTP auth rejected")}
		svc := NewOTPService(repo, mailer, "Imanya Fancy Goods")

		_, err := svc.IssueOTP(ctx, IssueOTPParams{
			Purpose: email.PurposeRegister,
			Email:   "fail@gmail.com",
		})
		if err == nil {
			t.Fatal("expected SMTP error")
		}
		if len(repo.records) != 0 {
			t.Fatalf("expected 0 OTP records stored when email delivery fails, got %d", len(repo.records))
		}
	})

	t.Run("Multi-provider dynamic OTP routing binds distinct OTPs to exact customer emails", func(t *testing.T) {
		repo := newStubOTPRepo()
		mailer := &StubEmailSender{}
		svc := NewOTPService(repo, mailer, "Imanya Fancy Goods").(*otpService)
		svc.nowFunc = func() time.Time { return time.Date(2026, 11, 25, 10, 0, 0, 0, time.UTC) }

		customers := []string{"abc@gmail.com", "xyz@yahoo.com", "customer@outlook.com"}
		challenges := make([]*OTPChallenge, 0, len(customers))
		otps := make([]string, 0, len(customers))

		for i, addr := range customers {
			ch, err := svc.IssueOTP(ctx, IssueOTPParams{
				Purpose:       email.PurposeRegister,
				Email:         addr,
				RecipientName: "Customer " + addr,
			})
			if err != nil {
				t.Fatalf("failed to issue OTP for %s: %v", addr, err)
			}
			if mailer.sentTo[i] != addr {
				t.Fatalf("expected email sent directly to %s, got %s", addr, mailer.sentTo[i])
			}
			challenges = append(challenges, ch)
			otps = append(otps, extractOTPFromBody(mailer.sentText[i]))
		}

		// Cross-customer verification must fail even with a valid OTP from another customer
		if _, err := svc.VerifyAndConsume(ctx, nil, challenges[0].VerificationID, customers[1], email.PurposeRegister, otps[0]); err == nil {
			t.Fatal("expected cross-customer email mismatch to fail")
		}
		if _, err := svc.VerifyAndConsume(ctx, nil, challenges[1].VerificationID, "", email.PurposeRegister, otps[1]); err == nil {
			t.Fatal("expected empty verification email to be rejected")
		}

		// Each customer verifies cleanly with their own OTP and exact email
		for i, addr := range customers {
			if _, err := svc.VerifyAndConsume(ctx, nil, challenges[i].VerificationID, addr, email.PurposeRegister, otps[i]); err != nil {
				t.Fatalf("expected %s to verify cleanly with own OTP, got %v", addr, err)
			}
		}
	})
}
