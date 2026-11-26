package service_test

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"testing"
	"time"

	auditRepo "distribution-management/internal/audit/repository"
	auditService "distribution-management/internal/audit/service"
	"distribution-management/internal/auth/dto"
	authService "distribution-management/internal/auth/service"
	"distribution-management/internal/config"
	customerRepo "distribution-management/internal/customers/repository"
	otpRepoPkg "distribution-management/internal/otp/repository"
	otpSvc "distribution-management/internal/otp/service"
	"distribution-management/internal/platform/database"
	userModel "distribution-management/internal/users/model"
	userRepo "distribution-management/internal/users/repository"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

type CaptureEmailSender struct {
	LastTo       string
	LastSubject  string
	LastHTMLBody string
	LastTextBody string
	FailErr      error
}

func (c *CaptureEmailSender) ValidateConfig() error { return c.FailErr }
func (c *CaptureEmailSender) Send(ctx context.Context, to, subject, htmlBody, textBody string) error {
	if c.FailErr != nil {
		return c.FailErr
	}
	c.LastTo = to
	c.LastSubject = subject
	c.LastHTMLBody = htmlBody
	c.LastTextBody = textBody
	return nil
}

func TestAuthService_RegistrationEmailAsUsernameAndOTPIntegration(t *testing.T) {
	_ = godotenv.Load("../../../.env")
	cfg, err := config.LoadConfig()
	if err != nil {
		t.Skip("Skipping PostgreSQL integration test: config unavailable")
	}

	db, err := database.Connect(cfg)
	if err != nil {
		t.Skipf("Skipping PostgreSQL integration test: database unreachable (%v)", err)
	}

	ctx := context.Background()
	uRepo := userRepo.NewUserRepository(db.DB)
	cRepo := customerRepo.NewCustomerRepository(db.DB)
	aService := auditService.NewAuditService(auditRepo.NewAuditRepository(db.DB))
	oRepo := otpRepoPkg.NewOTPRepository(db.DB)
	mailer := &CaptureEmailSender{}
	oService := otpSvc.NewOTPService(oRepo, mailer, "Imanya Fancy Goods")

	svc := authService.NewAuthService(uRepo, cRepo, oService, aService, "integration-test-secret", 24, db.DB)

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	testEmail := fmt.Sprintf("otp_test_%s@gmail.com", suffix)
	adminUsername := fmt.Sprintf("admin_test_%s", suffix)
	adminEmail := fmt.Sprintf("admin_test_%s@imanya.local", suffix)

	t.Cleanup(func() {
		db.Exec("DELETE FROM email_otp_verifications WHERE email LIKE 'otp_test_%@gmail.com'")
		db.Exec("DELETE FROM customers WHERE email LIKE 'otp_test_%@gmail.com'")
		db.Exec("DELETE FROM users WHERE email LIKE 'otp_test_%@gmail.com' OR email LIKE 'admin_test_%@imanya.local'")
		_ = db.SqlDB.Close()
	})

	// 1. Legacy direct registration without OTP is blocked
	_, err = svc.RegisterCustomer(ctx, &dto.RegisterCustomerRequest{
		FirstName:          "Test",
		LastName:           "Bypass",
		Email:              testEmail,
		Password:           "Secret123",
		Phone:              "0771234567",
		ResidentialAddress: "Colombo",
	}, "127.0.0.1", "test")
	if err == nil {
		t.Fatal("expected direct unverified registration to be blocked")
	}

	// 2. Initiate registration with uppercase email -> normalized & OTP sent to exact customer email
	challenge, err := svc.InitiateCustomerRegistration(ctx, &dto.RegisterCustomerRequest{
		FirstName:          "Nimali",
		LastName:           "Fernando",
		Email:              strings.ToUpper(testEmail),
		Password:           "CustomerPass123!",
		ConfirmPassword:    "CustomerPass123!",
		Phone:              "077 123 4567",
		ResidentialAddress: "No. 12, Galle Road, Colombo 03",
		TermsAccepted:      true,
	}, "127.0.0.1")
	if err != nil {
		t.Fatalf("failed to initiate registration: %v", err)
	}
	if mailer.LastTo != testEmail {
		t.Fatalf("expected OTP delivered to normalized %s, got %s", testEmail, mailer.LastTo)
	}

	// 3. Before verification, account must NOT exist in users table
	if existing, _ := uRepo.GetByEmail(ctx, testEmail); existing != nil {
		t.Fatal("user account must NOT exist prior to OTP verification")
	}

	re := regexp.MustCompile(`\b(\d{6})\b`)
	matches := re.FindStringSubmatch(mailer.LastTextBody)
	if len(matches) < 2 {
		t.Fatalf("failed to extract 6-digit OTP from email body")
	}
	otpCode := matches[1]

	// 4. Incorrect OTP fails and keeps user uncreated
	wrongOTP := "000000"
	if otpCode == wrongOTP {
		wrongOTP = "111111"
	}
	_, err = svc.VerifyCustomerRegistrationOTP(ctx, &dto.VerifyRegistrationOTPRequest{
		VerificationID: challenge.VerificationID,
		Email:          testEmail,
		OTP:            wrongOTP,
	}, "127.0.0.1", "test")
	if err == nil {
		t.Fatal("expected wrong OTP to be rejected")
	}
	if existing, _ := uRepo.GetByEmail(ctx, testEmail); existing != nil {
		t.Fatal("user account must NOT be created after wrong OTP")
	}

	// 5. Valid OTP creates verified User + Customer atomically with Email as Username
	verifiedResp, err := svc.VerifyCustomerRegistrationOTP(ctx, &dto.VerifyRegistrationOTPRequest{
		VerificationID: challenge.VerificationID,
		Email:          testEmail,
		OTP:            otpCode,
	}, "127.0.0.1", "test")
	if err != nil {
		t.Fatalf("expected valid OTP verification to succeed: %v", err)
	}
	if verifiedResp.User.Username != testEmail || verifiedResp.User.Email != testEmail || !verifiedResp.User.EmailVerified {
		t.Fatalf("expected email-as-username and email_verified=true, got %+v", verifiedResp.User)
	}

	// 6. Reusing exact same OTP fails
	_, err = svc.VerifyCustomerRegistrationOTP(ctx, &dto.VerifyRegistrationOTPRequest{
		VerificationID: challenge.VerificationID,
		Email:          testEmail,
		OTP:            otpCode,
	}, "127.0.0.1", "test")
	if err == nil {
		t.Fatal("expected reused OTP to be rejected")
	}

	// 7. Duplicate email registration fails
	_, err = svc.InitiateCustomerRegistration(ctx, &dto.RegisterCustomerRequest{
		FirstName:          "Dup",
		LastName:           "User",
		Email:              testEmail,
		Password:           "AnotherPass123",
		Phone:              "0779998888",
		ResidentialAddress: "Colombo",
	}, "127.0.0.1")
	if err == nil {
		t.Fatal("expected duplicate email registration to be rejected")
	}

	// 8. Verified customer logs in cleanly using Email + Password
	loginResp, err := svc.Login(ctx, &dto.LoginRequest{
		Email:    strings.ToUpper(testEmail),
		Password: "CustomerPass123!",
	}, "127.0.0.1", "test")
	if err != nil {
		t.Fatalf("expected verified customer to log in with email + password: %v", err)
	}
	if loginResp.Token == "" || loginResp.User.RoleName != "Customer" || loginResp.User.Username != testEmail {
		t.Fatalf("unexpected login response: %+v", loginResp)
	}

	// 9. Existing Admin login with username OR email remains unaffected
	adminHash, _ := bcrypt.GenerateFromPassword([]byte("AdminPass123!"), bcrypt.DefaultCost)
	adminUser := &userModel.User{
		RoleID:        1,
		Username:      adminUsername,
		Email:         adminEmail,
		PasswordHash:  string(adminHash),
		FirstName:     "Test",
		LastName:      "Admin",
		IsActive:      true,
		EmailVerified: true,
	}
	if err := db.Create(adminUser).Error; err != nil {
		t.Fatalf("failed to seed temporary admin for login test: %v", err)
	}
	adminLogin, err := svc.Login(ctx, &dto.LoginRequest{
		Email:    adminUsername,
		Password: "AdminPass123!",
	}, "127.0.0.1", "test")
	if err != nil || adminLogin.User.RoleName != "Super Administrator" {
		t.Fatalf("expected admin login via username to succeed: err=%v resp=%+v", err, adminLogin)
	}
}
