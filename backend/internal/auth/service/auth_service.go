package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"wholesale-management/internal/audit/service"
	"wholesale-management/internal/auth/dto"
	customerModel "wholesale-management/internal/customers/model"
	customerRepo "wholesale-management/internal/customers/repository"
	"wholesale-management/internal/platform/middleware"
	usersDto "wholesale-management/internal/users/dto"
	userModel "wholesale-management/internal/users/model"
	usersRepo "wholesale-management/internal/users/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService interface {
	Login(ctx context.Context, req *dto.LoginRequest, ip, ua string) (*dto.AuthResponse, error)
	RegisterCustomer(ctx context.Context, req *dto.RegisterCustomerRequest, ip, ua string) (*dto.AuthResponse, error)
}

type authService struct {
	userRepo       usersRepo.UserRepository
	custRepo       customerRepo.CustomerRepository
	auditService   service.AuditService
	jwtSecret      string
	expirationTime time.Duration
	db             *gorm.DB
}

func NewAuthService(
	userRepo usersRepo.UserRepository,
	custRepo customerRepo.CustomerRepository,
	auditService service.AuditService,
	jwtSecret string,
	expHours int,
	db *gorm.DB,
) AuthService {
	return &authService{
		userRepo:       userRepo,
		custRepo:       custRepo,
		auditService:   auditService,
		jwtSecret:      jwtSecret,
		expirationTime: time.Duration(expHours) * time.Hour,
		db:             db,
	}
}

func (s *authService) Login(ctx context.Context, req *dto.LoginRequest, ip, ua string) (*dto.AuthResponse, error) {
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		// Attempt lookup by username
		var userByUsername *userModel.User
		userByUsername, err = s.userRepo.GetByUsername(ctx, req.Email)
		if err != nil {
			return nil, errors.New("invalid email address/username or password")
		}
		user = userByUsername
	}

	if !user.IsActive {
		return nil, errors.New("this account has been deactivated. Please contact an administrator")
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
			ID:        user.ID,
			RoleID:    user.RoleID,
			RoleName:  user.Role.Name,
			Username:  user.Username,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			IsActive:  user.IsActive,
			CreatedAt: user.CreatedAt,
		},
	}

	if user.Role.Name == "Customer" && s.custRepo != nil {
		if cust, err := s.custRepo.GetByUserID(ctx, user.ID); err == nil && cust != nil {
			resp.BusinessName = cust.BusinessName
			resp.Phone = cust.Phone
			resp.Address = cust.DeliveryAddress
		}
	}

	return resp, nil
}

func (s *authService) RegisterCustomer(ctx context.Context, req *dto.RegisterCustomerRequest, ip, ua string) (*dto.AuthResponse, error) {
	// 1. Check if email already registered
	if existing, _ := s.userRepo.GetByEmail(ctx, req.Email); existing != nil {
		return nil, errors.New("this email address is already registered")
	}

	// 2. Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to secure password")
	}

	fullName := fmt.Sprintf("%s %s", req.FirstName, req.LastName)
	newUser := &userModel.User{
		RoleID:       4, // Customer role
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		IsActive:     true,
	}

	// 3. Atomically create User and Customer records
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(newUser).Error; err != nil {
			return fmt.Errorf("failed to create user account: %w", err)
		}

		newCustomer := &customerModel.Customer{
			UserID:          &newUser.ID,
			Name:            fullName,
			Email:           req.Email,
			Phone:           req.Phone,
			BusinessName:    req.BusinessName,
			DeliveryAddress: req.Address,
			IsActive:        true,
		}

		if err := tx.Create(newCustomer).Error; err != nil {
			return fmt.Errorf("failed to create customer profile: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 4. Generate JWT token
	expiresAt := time.Now().Add(s.expirationTime)
	claims := middleware.JWTClaims{
		UserID:   newUser.ID,
		RoleID:   4,
		RoleName: "Customer",
		Email:    newUser.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   newUser.ID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, errors.New("failed to generate authentication token")
	}

	s.auditService.LogAction(ctx, &newUser.ID, "CUSTOMER_REGISTER", "customers", newUser.ID, nil, map[string]string{
		"email": newUser.Email,
		"phone": req.Phone,
	}, ip, ua)

	return &dto.AuthResponse{
		Token:        tokenString,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.expirationTime.Seconds()),
		BusinessName: req.BusinessName,
		Phone:        req.Phone,
		Address:      req.Address,
		User: usersDto.UserResponse{
			ID:        newUser.ID,
			RoleID:    4,
			RoleName:  "Customer",
			Username:  newUser.Username,
			Email:     newUser.Email,
			FirstName: newUser.FirstName,
			LastName:  newUser.LastName,
			IsActive:  true,
			CreatedAt: newUser.CreatedAt,
		},
	}, nil
}
