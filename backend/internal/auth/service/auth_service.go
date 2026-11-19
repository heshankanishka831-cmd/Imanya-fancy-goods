package service

import (
	"context"
	"errors"
	"time"

	"wholesale-management/internal/audit/service"
	"wholesale-management/internal/auth/dto"
	"wholesale-management/internal/platform/middleware"
	usersDto "wholesale-management/internal/users/dto"
	usersRepo "wholesale-management/internal/users/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	Login(ctx context.Context, req *dto.LoginRequest, ip, ua string) (*dto.AuthResponse, error)
}

type authService struct {
	userRepo       usersRepo.UserRepository
	auditService   service.AuditService
	jwtSecret      string
	expirationTime time.Duration
}

func NewAuthService(userRepo usersRepo.UserRepository, auditService service.AuditService, jwtSecret string, expHours int) AuthService {
	return &authService{
		userRepo:       userRepo,
		auditService:   auditService,
		jwtSecret:      jwtSecret,
		expirationTime: time.Duration(expHours) * time.Hour,
	}
}

func (s *authService) Login(ctx context.Context, req *dto.LoginRequest, ip, ua string) (*dto.AuthResponse, error) {
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid email address or password")
	}

	if !user.IsActive {
		return nil, errors.New("this account has been deactivated. Please contact an administrator")
	}

	// Verify bcrypt password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email address or password")
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

	return &dto.AuthResponse{
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
	}, nil
}
