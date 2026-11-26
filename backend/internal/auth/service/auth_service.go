package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"distribution-management/internal/audit/service"
	"distribution-management/internal/auth/dto"
	customerModel "distribution-management/internal/customers/model"
	customerRepo "distribution-management/internal/customers/repository"
	otpSvc "distribution-management/internal/otp/service"
	"distribution-management/internal/platform/email"
	"distribution-management/internal/platform/middleware"
	usersDto "distribution-management/internal/users/dto"
	userModel "distribution-management/internal/users/model"
	usersRepo "distribution-management/internal/users/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService interface {
	Login(ctx context.Context, req *dto.LoginRequest, ip, ua string) (*dto.AuthResponse, error)
	RegisterCustomer(ctx context.Context, req *dto.RegisterCustomerRequest, ip, ua string) (*dto.AuthResponse, error)
	InitiateCustomerRegistration(ctx context.Context, req *dto.RegisterCustomerRequest, ip string) (*otpSvc.OTPChallenge, error)
	VerifyCustomerRegistrationOTP(ctx context.Context, req *dto.VerifyRegistrationOTPRequest, ip, ua string) (*dto.RegistrationVerifiedResponse, error)
	ResendRegistrationOTP(ctx context.Context, req *dto.ResendRegistrationOTPRequest) (*otpSvc.OTPChallenge, error)
}

type pendingRegistrationPayload struct {
	FirstName                 string `json:"first_name"`
	LastName                  string `json:"last_name"`
	Email                     string `json:"email"`
	PasswordHash              string `json:"password_hash"`
	Phone                     string `json:"phone"`
	BusinessName              string `json:"business_name"`
	ResidentialAddress        string `json:"residential_address"`
	DeliveryAddress           string `json:"delivery_address"`
	ResHouseNo                string `json:"res_house_no"`
	ResStreet                 string `json:"res_street"`
	ResCity                   string `json:"res_city"`
	ResDistrict               string `json:"res_district"`
	ResPostalCode             string `json:"res_postal_code"`
	DeliverySameAsResidential bool   `json:"delivery_same_as_residential"`
	DelRecipientName          string `json:"del_recipient_name"`
	DelPhone                  string `json:"del_phone"`
	DelHouseNo                string `json:"del_house_no"`
	DelStreet                 string `json:"del_street"`
	DelCity                   string `json:"del_city"`
	DelDistrict               string `json:"del_district"`
	DelPostalCode             string `json:"del_postal_code"`
}

type authService struct {
	userRepo       usersRepo.UserRepository
	custRepo       customerRepo.CustomerRepository
	otpService     otpSvc.OTPService
	auditService   service.AuditService
	jwtSecret      string
	expirationTime time.Duration
	db             *gorm.DB
}

func NewAuthService(
	userRepo usersRepo.UserRepository,
	custRepo customerRepo.CustomerRepository,
	otpService otpSvc.OTPService,
	auditService service.AuditService,
	jwtSecret string,
	expHours int,
	db *gorm.DB,
) AuthService {
	return &authService{
		userRepo:       userRepo,
		custRepo:       custRepo,
		otpService:     otpService,
		auditService:   auditService,
		jwtSecret:      jwtSecret,
		expirationTime: time.Duration(expHours) * time.Hour,
		db:             db,
	}
}

func (s *authService) Login(ctx context.Context, req *dto.LoginRequest, ip, ua string) (*dto.AuthResponse, error) {
	identifier := strings.TrimSpace(req.Email)
	user, err := s.userRepo.GetByEmail(ctx, identifier)
	if err != nil {
		// Fallback lookup by username (supports legacy customers & staff usernames)
		var userByUsername *userModel.User
		userByUsername, err = s.userRepo.GetByUsername(ctx, identifier)
		if err != nil {
			return nil, errors.New("invalid email address/username or password")
		}
		user = userByUsername
	}

	if !user.IsActive {
		return nil, errors.New("this account has been deactivated. Please contact an administrator")
	}

	if user.Role.Name == "Customer" && !user.EmailVerified {
		return nil, errors.New("please verify your email address before signing in")
	}

	// Verify bcrypt password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email address/username or password")
	}

	expiresAt := time.Now().Add(s.expirationTime)
	claims := middleware.JWTClaims{
		UserID:   user.ID,
		RoleID:   user.RoleID,
		RoleName: user.Role.Name,
		Email:    user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, errors.New("failed to generate authentication token")
	}

	s.auditService.LogAction(ctx, &user.ID, "USER_LOGIN", "users", user.ID, nil, map[string]string{"email": user.Email}, ip, ua)

	resp := &dto.AuthResponse{
		Token:     tokenString,
		TokenType: "Bearer",
		ExpiresIn: int64(s.expirationTime.Seconds()),
		User: usersDto.UserResponse{
			ID:            user.ID,
			RoleID:        user.RoleID,
			RoleName:      user.Role.Name,
			Username:      user.Username,
			Email:         user.Email,
			FirstName:     user.FirstName,
			LastName:      user.LastName,
			IsActive:      user.IsActive,
			EmailVerified: user.EmailVerified,
			CreatedAt:     user.CreatedAt,
		},
	}

	if user.Role.Name == "Customer" && s.custRepo != nil {
		if cust, err := s.custRepo.GetByUserID(ctx, user.ID); err == nil && cust != nil {
			resp.BusinessName = cust.BusinessName
			resp.Phone = cust.Phone
			resp.ResidentialAddress = cust.ResidentialAddress
			resp.DeliveryAddress = cust.DeliveryAddress
			resp.Address = cust.DeliveryAddress
			resp.MembershipTier = cust.MembershipTier
		}
	}

	return resp, nil
}

// RegisterCustomer blocks direct registration without email OTP verification
func (s *authService) RegisterCustomer(ctx context.Context, req *dto.RegisterCustomerRequest, ip, ua string) (*dto.AuthResponse, error) {
	return nil, errors.New("email verification via OTP is required to complete customer registration")
}

func countPhoneDigits(phone string) int {
	n := 0
	for _, r := range phone {
		if r >= '0' && r <= '9' {
			n++
		}
	}
	return n
}

func (s *authService) InitiateCustomerRegistration(ctx context.Context, req *dto.RegisterCustomerRequest, ip string) (*otpSvc.OTPChallenge, error) {
	if s.otpService == nil {
		return nil, errors.New("email OTP verification service is unavailable")
	}

	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)
	if firstName == "" || lastName == "" {
		return nil, errors.New("first name and last name must not be empty")
	}

	emailAddr := strings.ToLower(strings.TrimSpace(req.Email))
	if _, err := mail.ParseAddress(emailAddr); err != nil || !strings.Contains(emailAddr, ".") {
		return nil, errors.New("please provide a valid email address")
	}

	phone := strings.TrimSpace(req.Phone)
	if countPhoneDigits(phone) < 9 || countPhoneDigits(phone) > 15 {
		return nil, errors.New("please enter a valid WhatsApp contact number (9 to 15 digits)")
	}

	if len(req.Password) < 6 {
		return nil, errors.New("password must be at least 6 characters long")
	}
	if req.ConfirmPassword != "" && req.Password != req.ConfirmPassword {
		return nil, errors.New("password and confirm password do not match")
	}

	resAddress := strings.TrimSpace(req.ResidentialAddress)
	if resAddress == "" {
		resAddress = strings.TrimSpace(req.Address)
	}
	if resAddress == "" {
		return nil, errors.New("residential address is required")
	}

	delAddress := strings.TrimSpace(req.DeliveryAddress)
	if delAddress == "" {
		delAddress = resAddress
	}

	sameAsRes := true
	if req.DeliverySameAsResidential != nil {
		sameAsRes = *req.DeliverySameAsResidential
	} else if delAddress != "" && delAddress != resAddress {
		sameAsRes = false
	}

	// Enforce email & username uniqueness cleanly before sending OTP
	if existing, _ := s.userRepo.GetByEmail(ctx, emailAddr); existing != nil {
		return nil, errors.New("this email address is already registered. Please sign in or use another email")
	}
	if existingUsername, _ := s.userRepo.GetByUsername(ctx, emailAddr); existingUsername != nil {
		return nil, errors.New("this email address is already registered. Please sign in or use another email")
	}
	if s.custRepo != nil {
		if ok, err := s.custRepo.CheckEmailAvailable(ctx, emailAddr, "", ""); err == nil && !ok {
			return nil, errors.New("this email address is already registered. Please sign in or use another email")
		}
	}

	// Securely hash password immediately so plaintext password is never persisted anywhere
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to secure password")
	}

	payload := pendingRegistrationPayload{
		FirstName:                 firstName,
		LastName:                  lastName,
		Email:                     emailAddr,
		PasswordHash:              string(hashedPassword),
		Phone:                     phone,
		BusinessName:              strings.TrimSpace(req.BusinessName),
		ResidentialAddress:        resAddress,
		DeliveryAddress:           delAddress,
		ResHouseNo:                strings.TrimSpace(req.ResHouseNo),
		ResStreet:                 strings.TrimSpace(req.ResStreet),
		ResCity:                   strings.TrimSpace(req.ResCity),
		ResDistrict:               strings.TrimSpace(req.ResDistrict),
		ResPostalCode:             strings.TrimSpace(req.ResPostalCode),
		DeliverySameAsResidential: sameAsRes,
		DelRecipientName:          strings.TrimSpace(req.DelRecipientName),
		DelPhone:                  strings.TrimSpace(req.DelPhone),
		DelHouseNo:                strings.TrimSpace(req.DelHouseNo),
		DelStreet:                 strings.TrimSpace(req.DelStreet),
		DelCity:                   strings.TrimSpace(req.DelCity),
		DelDistrict:               strings.TrimSpace(req.DelDistrict),
		DelPostalCode:             strings.TrimSpace(req.DelPostalCode),
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, errors.New("failed to prepare registration verification payload")
	}

	challenge, err := s.otpService.IssueOTP(ctx, otpSvc.IssueOTPParams{
		Purpose:       email.PurposeRegister,
		Email:         emailAddr,
		RecipientName: fmt.Sprintf("%s %s", firstName, lastName),
		PayloadJSON:   payloadBytes,
		RequestIP:     ip,
	})
	if err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, nil, "CUSTOMER_REGISTER_OTP_SENT", "email_otp_verifications", challenge.VerificationID, nil, map[string]string{
		"email": emailAddr,
	}, ip, "")

	return challenge, nil
}

func (s *authService) VerifyCustomerRegistrationOTP(ctx context.Context, req *dto.VerifyRegistrationOTPRequest, ip, ua string) (*dto.RegistrationVerifiedResponse, error) {
	if s.otpService == nil || s.db == nil {
		return nil, errors.New("email verification service is unavailable")
	}

	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	var createdUser *userModel.User

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		rec, err := s.otpService.VerifyAndConsume(ctx, tx, req.VerificationID, cleanEmail, email.PurposeRegister, req.OTP)
		if err != nil {
			return err
		}

		var payload pendingRegistrationPayload
		if err := json.Unmarshal(rec.PayloadJSON, &payload); err != nil {
			return errors.New("invalid pending registration payload. Please register again")
		}

		// Re-check uniqueness atomically inside the transaction
		var count int64
		if err := tx.Model(&userModel.User{}).
			Where("LOWER(email) = ? OR LOWER(username) = ?", payload.Email, payload.Email).
			Count(&count).Error; err != nil {
			return fmt.Errorf("failed to verify email availability: %w", err)
		}
		if count > 0 {
			return errors.New("this email address has already been registered")
		}

		newUser := &userModel.User{
			RoleID:        4, // Strictly Customer role
			Username:      payload.Email,
			Email:         payload.Email,
			PasswordHash:  payload.PasswordHash,
			FirstName:     payload.FirstName,
			LastName:      payload.LastName,
			IsActive:      true,
			EmailVerified: true,
		}
		if err := tx.Create(newUser).Error; err != nil {
			return fmt.Errorf("failed to create user account: %w", err)
		}

		newCustomer := &customerModel.Customer{
			UserID:                    &newUser.ID,
			FirstName:                 payload.FirstName,
			LastName:                  payload.LastName,
			Name:                      fmt.Sprintf("%s %s", payload.FirstName, payload.LastName),
			Email:                     payload.Email,
			Phone:                     payload.Phone,
			BusinessName:              payload.BusinessName,
			ResidentialAddress:        payload.ResidentialAddress,
			DeliveryAddress:           payload.DeliveryAddress,
			ResHouseNo:                payload.ResHouseNo,
			ResStreet:                 payload.ResStreet,
			ResCity:                   payload.ResCity,
			ResDistrict:               payload.ResDistrict,
			ResPostalCode:             payload.ResPostalCode,
			DeliverySameAsResidential: payload.DeliverySameAsResidential,
			DelRecipientName:          payload.DelRecipientName,
			DelPhone:                  payload.DelPhone,
			DelHouseNo:                payload.DelHouseNo,
			DelStreet:                 payload.DelStreet,
			DelCity:                   payload.DelCity,
			DelDistrict:               payload.DelDistrict,
			DelPostalCode:             payload.DelPostalCode,
			MembershipTier:            "BRONZE",
			LifetimeSpent:             0.00,
			IsActive:                  true,
		}
		if err := tx.Create(newCustomer).Error; err != nil {
			return fmt.Errorf("failed to create customer profile: %w", err)
		}

		createdUser = newUser
		return nil
	})

	if err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &createdUser.ID, "CUSTOMER_REGISTER_VERIFIED", "customers", createdUser.ID, nil, map[string]string{
		"email": createdUser.Email,
	}, ip, ua)

	return &dto.RegistrationVerifiedResponse{
		Message: "Email verified successfully! Your customer account is active — you can now sign in with your email and password.",
		Email:   createdUser.Email,
		User: usersDto.UserResponse{
			ID:            createdUser.ID,
			RoleID:        createdUser.RoleID,
			RoleName:      "Customer",
			Username:      createdUser.Username,
			Email:         createdUser.Email,
			FirstName:     createdUser.FirstName,
			LastName:      createdUser.LastName,
			IsActive:      createdUser.IsActive,
			EmailVerified: createdUser.EmailVerified,
			CreatedAt:     createdUser.CreatedAt,
		},
	}, nil
}

func (s *authService) ResendRegistrationOTP(ctx context.Context, req *dto.ResendRegistrationOTPRequest) (*otpSvc.OTPChallenge, error) {
	if s.otpService == nil {
		return nil, errors.New("email verification service is unavailable")
	}
	return s.otpService.ResendOTP(ctx, req.VerificationID, email.PurposeRegister, strings.TrimSpace(req.RecipientName))
}
