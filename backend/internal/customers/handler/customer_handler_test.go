package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"distribution-management/internal/customers/dto"
	"distribution-management/internal/customers/handler"
	"distribution-management/internal/customers/model"
	otpRepoPkg "distribution-management/internal/otp/repository"
	otpSvc "distribution-management/internal/otp/service"
	"distribution-management/internal/platform/middleware"
	"distribution-management/internal/platform/storage"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type StubCustomerService struct {
	lastRequestedUserID string
	profiles            map[string]*dto.CustomerResponse
}

func (s *StubCustomerService) ConfigureEmailVerification(otpService otpSvc.OTPService, otpRepo otpRepoPkg.OTPRepository, db *gorm.DB) {
}

func (s *StubCustomerService) ConfigureStorage(diskStorage *storage.DiskStorage) {
}

func (s *StubCustomerService) UploadProfilePhoto(ctx context.Context, userID string, file *multipart.FileHeader, ip, ua string) (*dto.CustomerResponse, error) {
	return s.profiles[userID], nil
}

func (s *StubCustomerService) RemoveProfilePhoto(ctx context.Context, userID string, ip, ua string) (*dto.CustomerResponse, error) {
	return s.profiles[userID], nil
}

func (s *StubCustomerService) GetOrCreateByPhone(ctx context.Context, name, phone, email, address string) (*model.Customer, error) {
	return nil, nil
}

func (s *StubCustomerService) GetProfileByUserID(ctx context.Context, userID string) (*dto.CustomerResponse, error) {
	s.lastRequestedUserID = userID
	return s.profiles[userID], nil
}

func (s *StubCustomerService) UpdateProfile(ctx context.Context, userID string, req *dto.CustomerProfileRequest, ip, ua string) (*dto.CustomerResponse, error) {
	s.lastRequestedUserID = userID
	prof := s.profiles[userID]
	prof.FirstName = req.FirstName
	prof.LastName = req.LastName
	prof.Email = req.Email
	return prof, nil
}

func (s *StubCustomerService) ChangePassword(ctx context.Context, userID string, req *dto.ChangePasswordRequest, ip, ua string) error {
	s.lastRequestedUserID = userID
	return nil
}

func (s *StubCustomerService) GetByID(ctx context.Context, id string) (*dto.CustomerResponse, error) {
	return nil, nil
}

func (s *StubCustomerService) List(ctx context.Context, filter dto.CustomerFilter) ([]dto.CustomerResponse, int64, error) {
	return nil, 0, nil
}

func (s *StubCustomerService) AdminUpdate(ctx context.Context, actorID, id string, req *dto.AdminUpdateCustomerRequest, ip, ua string) (*dto.CustomerResponse, error) {
	return nil, nil
}

func (s *StubCustomerService) UpdateStatus(ctx context.Context, actorID, id string, req *dto.CustomerStatusRequest, ip, ua string) (*dto.CustomerResponse, error) {
	return nil, nil
}

func (s *StubCustomerService) AdminResetPassword(ctx context.Context, actorID, id string, req *dto.AdminResetPasswordRequest, ip, ua string) error {
	return nil
}

func (s *StubCustomerService) InitiateEmailChange(ctx context.Context, userID string, req *dto.InitiateEmailChangeRequest, ip string) (*otpSvc.OTPChallenge, error) {
	s.lastRequestedUserID = userID
	return &otpSvc.OTPChallenge{VerificationID: "v-1", Email: req.NewEmail, ExpiresInSeconds: 300, ResendCooldownSeconds: 60}, nil
}

func (s *StubCustomerService) VerifyEmailChange(ctx context.Context, userID string, req *dto.VerifyEmailChangeRequest, ip, ua string) (*dto.CustomerResponse, error) {
	s.lastRequestedUserID = userID
	return s.profiles[userID], nil
}

func (s *StubCustomerService) ResendEmailChangeOTP(ctx context.Context, userID, verificationID string) (*otpSvc.OTPChallenge, error) {
	s.lastRequestedUserID = userID
	return &otpSvc.OTPChallenge{VerificationID: verificationID, ExpiresInSeconds: 300, ResendCooldownSeconds: 60}, nil
}

func signTestToken(secret, userID, roleName string) string {
	claims := middleware.JWTClaims{
		UserID:   userID,
		RoleID:   4,
		RoleName: roleName,
		Email:    userID + "@example.com",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, _ := tok.SignedString([]byte(secret))
	return s
}

func TestCustomerProfileRoleAndOwnershipSecurity(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret-key"

	svc := &StubCustomerService{
		profiles: map[string]*dto.CustomerResponse{
			"user-a": {ID: "cust-a", Username: "custA", Email: "a@example.com", FirstName: "Alice", LastName: "A", PasswordStatus: "Protected"},
			"user-b": {ID: "cust-b", Username: "custB", Email: "b@example.com", FirstName: "Bob", LastName: "B", PasswordStatus: "Protected"},
		},
	}
	hdlr := handler.NewCustomerHandler(svc)

	r := gin.New()
	cust := r.Group("/api/v1/customer", middleware.AuthMiddleware(secret), middleware.RequireExactRole("Customer"))
	cust.GET("/profile", hdlr.GetMyProfile)
	cust.PUT("/profile", hdlr.UpdateMyProfile)

	t.Run("Unauthenticated access returns 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/customer/profile", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", w.Code)
		}
	})

	t.Run("Non-Customer role (Admin) is blocked with 403", func(t *testing.T) {
		adminToken := signTestToken(secret, "admin-1", "Super Administrator")
		req := httptest.NewRequest(http.MethodGet, "/api/v1/customer/profile", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for admin on customer endpoint, got %d", w.Code)
		}
	})

	t.Run("Customer A token only reads and updates Customer A even if payload tries to pass another ID", func(t *testing.T) {
		tokenA := signTestToken(secret, "user-a", "Customer")

		// GET profile
		reqGet := httptest.NewRequest(http.MethodGet, "/api/v1/customer/profile", nil)
		reqGet.Header.Set("Authorization", "Bearer "+tokenA)
		wGet := httptest.NewRecorder()
		r.ServeHTTP(wGet, reqGet)
		if wGet.Code != http.StatusOK || svc.lastRequestedUserID != "user-a" {
			t.Fatalf("expected 200 for user-a, got code=%d userID=%s", wGet.Code, svc.lastRequestedUserID)
		}

		// PUT profile attempting to supply another user_id or tier in JSON
		body, _ := json.Marshal(map[string]interface{}{
			"user_id":         "user-b",
			"membership_tier": "PLATINUM",
			"first_name":      "Alice",
			"last_name":       "Updated",
			"email":           "a@example.com",
			"phone":           "0771234567",
		})
		reqPut := httptest.NewRequest(http.MethodPut, "/api/v1/customer/profile", bytes.NewReader(body))
		reqPut.Header.Set("Authorization", "Bearer "+tokenA)
		reqPut.Header.Set("Content-Type", "application/json")
		wPut := httptest.NewRecorder()
		r.ServeHTTP(wPut, reqPut)
		if wPut.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d (%s)", wPut.Code, wPut.Body.String())
		}
		if svc.lastRequestedUserID != "user-a" {
			t.Fatalf("expected ownership locked to user-a, got %s", svc.lastRequestedUserID)
		}
		if svc.profiles["user-b"].LastName != "B" {
			t.Fatal("customer B was modified by customer A request")
		}
	})
}
