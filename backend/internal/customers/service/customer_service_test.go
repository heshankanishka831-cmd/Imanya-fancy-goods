package service_test

import (
	"context"
	"regexp"
	"strings"
	"testing"
	"time"

	auditModel "distribution-management/internal/audit/model"
	"distribution-management/internal/customers/dto"
	"distribution-management/internal/customers/model"
	"distribution-management/internal/customers/service"
	otpModel "distribution-management/internal/otp/model"
	otpSvc "distribution-management/internal/otp/service"
	userModel "distribution-management/internal/users/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type StubCustomerRepository struct {
	customer        *model.Customer
	customersByUser map[string]*model.Customer
	usersByID       map[string]*userModel.User
	user            *userModel.User
	orderCount      int64
	orderStats      *dto.OrderStatsDTO
	takenUsernames  map[string]string
	takenEmails     map[string]string
	updateCount     int
	statusCalls     int
	passHash        string
}

func (s *StubCustomerRepository) GetByID(ctx context.Context, id string) (*model.Customer, error) {
	if s.customer == nil {
		return nil, nil
	}
	return s.customer, nil
}

func (s *StubCustomerRepository) GetByUserID(ctx context.Context, userID string) (*model.Customer, error) {
	if s.customersByUser != nil {
		if c, ok := s.customersByUser[userID]; ok {
			return c, nil
		}
		return nil, nil
	}
	return s.customer, nil
}

func (s *StubCustomerRepository) GetByPhone(ctx context.Context, phone string) (*model.Customer, error) {
	return s.customer, nil
}

func (s *StubCustomerRepository) Create(ctx context.Context, customer *model.Customer) error {
	s.customer = customer
	return nil
}

func (s *StubCustomerRepository) Update(ctx context.Context, customer *model.Customer) error {
	s.customer = customer
	s.updateCount++
	return nil
}

func (s *StubCustomerRepository) UpdateProfileAtomic(ctx context.Context, user *userModel.User, customer *model.Customer) error {
	s.customer = customer
	s.user = user
	if s.customersByUser != nil && customer.UserID != nil {
		s.customersByUser[*customer.UserID] = customer
	}
	if s.usersByID != nil && user != nil {
		s.usersByID[user.ID] = user
	}
	s.updateCount++
	return nil
}

func (s *StubCustomerRepository) List(ctx context.Context, filter dto.CustomerFilter) ([]model.Customer, int64, error) {
	if s.customer == nil {
		return nil, 0, nil
	}
	return []model.Customer{*s.customer}, 1, nil
}

func (s *StubCustomerRepository) GetOrderCount(ctx context.Context, customerID string) (int64, error) {
	return s.orderCount, nil
}

func (s *StubCustomerRepository) GetOrderStats(ctx context.Context, customerID string) (*dto.OrderStatsDTO, error) {
	if s.orderStats != nil {
		return s.orderStats, nil
	}
	return &dto.OrderStatsDTO{TotalOrders: s.orderCount}, nil
}

func (s *StubCustomerRepository) GetOrderStatsBatch(ctx context.Context, customerIDs []string) (map[string]*dto.OrderStatsDTO, error) {
	res := make(map[string]*dto.OrderStatsDTO, len(customerIDs))
	for _, id := range customerIDs {
		st, _ := s.GetOrderStats(ctx, id)
		res[id] = st
	}
	return res, nil
}

func (s *StubCustomerRepository) UpdateStatus(ctx context.Context, customerID string, isActive bool) error {
	s.statusCalls++
	if s.customer != nil {
		s.customer.IsActive = isActive
	}
	if s.user != nil {
		s.user.IsActive = isActive
	}
	return nil
}

func (s *StubCustomerRepository) UpdateUserPassword(ctx context.Context, userID, newHash string) error {
	s.passHash = newHash
	if s.user != nil {
		s.user.PasswordHash = newHash
	}
	return nil
}

func (s *StubCustomerRepository) GetUserByID(ctx context.Context, userID string) (*userModel.User, error) {
	if s.usersByID != nil {
		return s.usersByID[userID], nil
	}
	return s.user, nil
}

func (s *StubCustomerRepository) CheckUsernameAvailable(ctx context.Context, username, excludeUserID string) (bool, error) {
	if owner, ok := s.takenUsernames[strings.ToLower(username)]; ok && owner != excludeUserID {
		return false, nil
	}
	return true, nil
}

func (s *StubCustomerRepository) CheckEmailAvailable(ctx context.Context, email, excludeUserID, excludeCustomerID string) (bool, error) {
	if owner, ok := s.takenEmails[strings.ToLower(email)]; ok && owner != excludeUserID {
		return false, nil
	}
	return true, nil
}

func (s *StubCustomerRepository) UpdateVerifiedEmailAndUsername(ctx context.Context, tx *gorm.DB, userID, customerID, newEmail string) error {
	normalized := strings.ToLower(strings.TrimSpace(newEmail))
	if s.usersByID != nil && s.usersByID[userID] != nil {
		s.usersByID[userID].Email = normalized
		s.usersByID[userID].Username = normalized
		s.usersByID[userID].EmailVerified = true
	}
	if s.customersByUser != nil && s.customersByUser[userID] != nil {
		s.customersByUser[userID].Email = normalized
	}
	return nil
}

type StubAuditService struct{}

func (s *StubAuditService) LogAction(ctx context.Context, userID *string, action, resource, resourceID string, oldVal, newVal interface{}, ip, ua string) {
}

func (s *StubAuditService) ListLogs(ctx context.Context, action string, page, limit int) ([]auditModel.AuditLog, int64, error) {
	return nil, 0, nil
}

type StubOTPRepoForCustomer struct {
	records map[string]*otpModel.EmailOTPVerification
}

func newStubOTPRepoForCustomer() *StubOTPRepoForCustomer {
	return &StubOTPRepoForCustomer{records: make(map[string]*otpModel.EmailOTPVerification)}
}

func (r *StubOTPRepoForCustomer) Create(ctx context.Context, rec *otpModel.EmailOTPVerification) error {
	cp := *rec
	r.records[rec.ID] = &cp
	return nil
}
func (r *StubOTPRepoForCustomer) GetByID(ctx context.Context, id string) (*otpModel.EmailOTPVerification, error) {
	rec, ok := r.records[id]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	cp := *rec
	return &cp, nil
}
func (r *StubOTPRepoForCustomer) GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id string) (*otpModel.EmailOTPVerification, error) {
	return r.GetByID(ctx, id)
}
func (r *StubOTPRepoForCustomer) GetLatestActiveByEmailAndPurpose(ctx context.Context, emailAddr, purpose string) (*otpModel.EmailOTPVerification, error) {
	for _, rec := range r.records {
		if strings.EqualFold(rec.Email, emailAddr) && rec.Purpose == purpose && rec.ConsumedAt == nil {
			cp := *rec
			return &cp, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}
func (r *StubOTPRepoForCustomer) ConsumeOtherActive(ctx context.Context, emailAddr, purpose, excludeID string, now time.Time) error {
	return nil
}
func (r *StubOTPRepoForCustomer) IncrementAttempts(ctx context.Context, id string, lockAfterMax bool, maxAttempts int, now time.Time) error {
	if rec, ok := r.records[id]; ok {
		rec.Attempts++
	}
	return nil
}
func (r *StubOTPRepoForCustomer) UpdateForResend(ctx context.Context, id, newOTPHash string, newExpiresAt, now time.Time) error {
	return nil
}
func (r *StubOTPRepoForCustomer) MarkVerifiedAndConsumed(ctx context.Context, tx *gorm.DB, id string, now time.Time) error {
	if rec, ok := r.records[id]; ok {
		t := now
		rec.VerifiedAt = &t
		rec.ConsumedAt = &t
		return nil
	}
	return gorm.ErrRecordNotFound
}

type StubEmailSenderForCustomer struct {
	sentTo   []string
	sentText []string
}

func (s *StubEmailSenderForCustomer) ValidateConfig() error { return nil }
func (s *StubEmailSenderForCustomer) Send(ctx context.Context, to, subject, htmlBody, textBody string) error {
	s.sentTo = append(s.sentTo, to)
	s.sentText = append(s.sentText, textBody)
	return nil
}

func TestCustomerService_UpdateProfileAndEmailVerification(t *testing.T) {
	ctx := context.Background()
	u1 := "user-1"
	u2 := "user-2"

	user1 := &userModel.User{ID: u1, Username: "sunil@example.com", Email: "sunil@example.com", FirstName: "Sunil", LastName: "Perera", IsActive: true, EmailVerified: true}
	cust1 := &model.Customer{
		ID:                        "cust-1",
		UserID:                    &u1,
		User:                      user1,
		FirstName:                 "Sunil",
		LastName:                  "Perera",
		Name:                      "Sunil Perera",
		Email:                     "sunil@example.com",
		Phone:                     "0771234567",
		MembershipTier:            "SILVER",
		LifetimeSpent:             150000,
		DeliverySameAsResidential: true,
		IsActive:                  true,
	}

	user2 := &userModel.User{ID: u2, Username: "kamal@example.com", Email: "kamal@example.com", FirstName: "Kamal", LastName: "Silva", IsActive: true, EmailVerified: true}
	cust2 := &model.Customer{ID: "cust-2", UserID: &u2, User: user2, Name: "Kamal Silva", Email: "kamal@example.com", Phone: "0779998888", IsActive: true}

	stubRepo := &StubCustomerRepository{
		customersByUser: map[string]*model.Customer{u1: cust1, u2: cust2},
		usersByID:       map[string]*userModel.User{u1: user1, u2: user2},
		takenUsernames:  map[string]string{"kamal@example.com": u2, "sunil@example.com": u1},
		takenEmails:     map[string]string{"kamal@example.com": u2, "sunil@example.com": u1},
		orderStats: &dto.OrderStatsDTO{
			TotalOrders:      5,
			CompletedOrders:  3,
			PendingOrders:    1,
			ProcessingOrders: 1,
			TotalAmountSpent: 150000,
		},
	}

	otpRepo := newStubOTPRepoForCustomer()
	mailer := &StubEmailSenderForCustomer{}
	otpService := otpSvc.NewOTPService(otpRepo, mailer, "Imanya Fancy Goods")

	svc := service.NewCustomerService(stubRepo, &StubAuditService{})
	svc.ConfigureEmailVerification(otpService, otpRepo, nil)

	t.Run("GetProfile returns authenticated customer data and order stats without hash", func(t *testing.T) {
		res, err := svc.GetProfileByUserID(ctx, u1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.ID != "cust-1" || res.Email != "sunil@example.com" {
			t.Errorf("unexpected profile identity: %+v", res)
		}
		if res.OrderStats.TotalOrders != 5 || res.OrderStats.CompletedOrders != 3 || res.OrderStats.TotalAmountSpent != 150000 {
			t.Errorf("unexpected order stats: %+v", res.OrderStats)
		}
		if res.PasswordStatus != "Protected" {
			t.Errorf("expected Protected password status, got %s", res.PasswordStatus)
		}
	})

	t.Run("Direct unverified email change via UpdateProfile is rejected", func(t *testing.T) {
		same := true
		_, err := svc.UpdateProfile(ctx, u1, &dto.CustomerProfileRequest{
			FirstName:                 "Sunil",
			LastName:                  "Perera",
			Email:                     "sunil.unverified@example.com",
			Phone:                     "0771234567",
			ResHouseNo:                "No. 45",
			ResStreet:                 "Temple Road",
			ResCity:                   "Maharagama",
			ResDistrict:               "Colombo",
			DeliverySameAsResidential: &same,
		}, "127.0.0.1", "agent")
		if err == nil {
			t.Fatal("expected direct unverified email update to be rejected")
		}
		if user1.Email != "sunil@example.com" {
			t.Fatal("old verified email should remain unchanged")
		}
	})

	t.Run("Email change rejects duplicate email and updates email+username only after OTP verification", func(t *testing.T) {
		_, err := svc.InitiateEmailChange(ctx, u1, &dto.InitiateEmailChangeRequest{NewEmail: "kamal@example.com"}, "127.0.0.1")
		if err == nil {
			t.Fatal("expected duplicate email error")
		}

		challenge, err := svc.InitiateEmailChange(ctx, u1, &dto.InitiateEmailChangeRequest{NewEmail: "sunil.verified@example.com"}, "127.0.0.1")
		if err != nil {
			t.Fatalf("unexpected error initiating email change: %v", err)
		}
		if user1.Email != "sunil@example.com" {
			t.Fatal("old email must stay active until OTP verification finishes")
		}

		re := regexp.MustCompile(`\b(\d{6})\b`)
		otpCode := re.FindStringSubmatch(mailer.sentText[0])[1]

		// User 2 cannot verify User 1's OTP challenge
		_, err = svc.VerifyEmailChange(ctx, u2, &dto.VerifyEmailChangeRequest{
			VerificationID: challenge.VerificationID,
			NewEmail:       "sunil.verified@example.com",
			OTP:            otpCode,
		}, "127.0.0.1", "agent")
		if err == nil {
			t.Fatal("expected ownership error when another user attempts verification")
		}

		// User 1 verifies cleanly -> both Email and Username update atomically
		updated, err := svc.VerifyEmailChange(ctx, u1, &dto.VerifyEmailChangeRequest{
			VerificationID: challenge.VerificationID,
			NewEmail:       "sunil.verified@example.com",
			OTP:            otpCode,
		}, "127.0.0.1", "agent")
		if err != nil {
			t.Fatalf("unexpected error verifying email change: %v", err)
		}
		if updated.Email != "sunil.verified@example.com" || updated.Username != "sunil.verified@example.com" {
			t.Errorf("expected both email and username to update, got email=%s username=%s", updated.Email, updated.Username)
		}
	})

	t.Run("Updating structured personal info and separate delivery address preserves saved fields on toggle ON", func(t *testing.T) {
		off := false
		res, err := svc.UpdateProfile(ctx, u1, &dto.CustomerProfileRequest{
			FirstName:                 "Sunil",
			LastName:                  "Bandara",
			Email:                     "sunil.verified@example.com",
			Phone:                     "077 555 4444",
			BusinessName:              "Sunil Fancy Mart",
			ResHouseNo:                "No. 45",
			ResStreet:                 "Temple Road",
			ResCity:                   "Maharagama",
			ResDistrict:               "Colombo",
			ResPostalCode:             "10280",
			DeliverySameAsResidential: &off,
			DelRecipientName:          "Nimal Perera",
			DelPhone:                  "071 222 3333",
			DelHouseNo:                "Suite 8",
			DelStreet:                 "Main Street",
			DelCity:                   "Kandy",
			DelDistrict:               "Kandy",
			DelPostalCode:             "20000",
		}, "127.0.0.1", "agent")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.MembershipTier != "SILVER" {
			t.Errorf("protected membership tier unexpectedly changed: %s", res.MembershipTier)
		}
		if res.DeliverySameAsResidential || res.DelCity != "Kandy" {
			t.Errorf("separate delivery details mismatch: %+v", res)
		}

		on := true
		res2, err := svc.UpdateProfile(ctx, u1, &dto.CustomerProfileRequest{
			FirstName:                 "Sunil",
			LastName:                  "Bandara",
			Email:                     "sunil.verified@example.com",
			Phone:                     "077 555 4444",
			ResHouseNo:                "No. 45",
			ResStreet:                 "Temple Road",
			ResCity:                   "Maharagama",
			ResDistrict:               "Colombo",
			ResPostalCode:             "10280",
			DeliverySameAsResidential: &on,
		}, "127.0.0.1", "agent")
		if err != nil {
			t.Fatalf("unexpected error on toggle ON: %v", err)
		}
		if res2.DeliveryAddress != res2.ResidentialAddress || res2.DelCity != "Kandy" {
			t.Errorf("expected sync to residential while preserving saved separate fields: %+v", res2)
		}
	})
}

func TestCustomerService_ChangePassword(t *testing.T) {
	ctx := context.Background()
	currentPlain := "CurrentPass123"
	hash, _ := bcrypt.GenerateFromPassword([]byte(currentPlain), bcrypt.DefaultCost)

	user := &userModel.User{
		ID:           "user-1",
		PasswordHash: string(hash),
	}

	stubRepo := &StubCustomerRepository{user: user}
	stubAudit := &StubAuditService{}
	svc := service.NewCustomerService(stubRepo, stubAudit)

	t.Run("Mismatched confirm password rejected", func(t *testing.T) {
		req := &dto.ChangePasswordRequest{
			CurrentPassword: currentPlain,
			NewPassword:     "NewPass123",
			ConfirmPassword: "DifferentPass",
		}
		err := svc.ChangePassword(ctx, "user-1", req, "127.0.0.1", "agent")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("Short password (<8 chars) rejected", func(t *testing.T) {
		req := &dto.ChangePasswordRequest{
			CurrentPassword: currentPlain,
			NewPassword:     "Short7",
			ConfirmPassword: "Short7",
		}
		err := svc.ChangePassword(ctx, "user-1", req, "127.0.0.1", "agent")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("Incorrect current password rejected", func(t *testing.T) {
		req := &dto.ChangePasswordRequest{
			CurrentPassword: "WrongPassword",
			NewPassword:     "NewPass123",
			ConfirmPassword: "NewPass123",
		}
		err := svc.ChangePassword(ctx, "user-1", req, "127.0.0.1", "agent")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("Valid password change succeeds", func(t *testing.T) {
		req := &dto.ChangePasswordRequest{
			CurrentPassword: currentPlain,
			NewPassword:     "BrandNewPass123",
			ConfirmPassword: "BrandNewPass123",
		}
		err := svc.ChangePassword(ctx, "user-1", req, "127.0.0.1", "agent")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if err := bcrypt.CompareHashAndPassword([]byte(stubRepo.passHash), []byte("BrandNewPass123")); err != nil {
			t.Error("new password hash does not match BrandNewPass123")
		}
	})
}

func TestCustomerService_AdminResetPassword(t *testing.T) {
	ctx := context.Background()
	userId := "user-99"
	cust := &model.Customer{
		ID:     "cust-99",
		UserID: &userId,
	}

	stubRepo := &StubCustomerRepository{customer: cust}
	stubAudit := &StubAuditService{}
	svc := service.NewCustomerService(stubRepo, stubAudit)

	t.Run("Short password rejected", func(t *testing.T) {
		err := svc.AdminResetPassword(ctx, "admin-1", "cust-99", &dto.AdminResetPasswordRequest{NewPassword: "abc"}, "127.0.0.1", "agent")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("Valid reset succeeds", func(t *testing.T) {
		err := svc.AdminResetPassword(ctx, "admin-1", "cust-99", &dto.AdminResetPasswordRequest{NewPassword: "SecureReset123"}, "127.0.0.1", "agent")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if err := bcrypt.CompareHashAndPassword([]byte(stubRepo.passHash), []byte("SecureReset123")); err != nil {
			t.Error("reset password hash does not match")
		}
	})
}

func TestCustomerService_UpdateStatus(t *testing.T) {
	ctx := context.Background()
	userId := "user-1"
	cust := &model.Customer{
		ID:       "cust-1",
		UserID:   &userId,
		IsActive: true,
	}
	user := &userModel.User{
		ID:       userId,
		IsActive: true,
	}

	stubRepo := &StubCustomerRepository{customer: cust, user: user}
	stubAudit := &StubAuditService{}
	svc := service.NewCustomerService(stubRepo, stubAudit)

	res, err := svc.UpdateStatus(ctx, "admin-1", "cust-1", &dto.CustomerStatusRequest{IsActive: false}, "127.0.0.1", "agent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.IsActive {
		t.Error("expected customer to be deactivated")
	}
	if user.IsActive {
		t.Error("expected linked user to be deactivated")
	}
	if res.PasswordStatus != "Protected" {
		t.Errorf("expected PasswordStatus Protected, got %s", res.PasswordStatus)
	}
}
