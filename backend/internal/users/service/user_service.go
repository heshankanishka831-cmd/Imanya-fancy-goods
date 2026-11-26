package service

import (
	"context"
	"errors"
	"fmt"

	"distribution-management/internal/audit/service"
	"distribution-management/internal/users/dto"
	"distribution-management/internal/users/model"
	"distribution-management/internal/users/repository"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService interface {
	CreateUser(ctx context.Context, actorID string, req *dto.CreateUserRequest, ip, ua string) (*dto.UserResponse, error)
	ListUsers(ctx context.Context, page, limit int) ([]dto.UserResponse, int64, error)
	GetUserByID(ctx context.Context, id string) (*dto.UserResponse, error)
	UpdateUserStatus(ctx context.Context, actorID, targetID string, isActive bool, ip, ua string) error
	GetRoles(ctx context.Context) ([]model.Role, error)
}

type userService struct {
	repo         repository.UserRepository
	auditService service.AuditService
}

func NewUserService(repo repository.UserRepository, auditService service.AuditService) UserService {
	return &userService{repo: repo, auditService: auditService}
}

func (s *userService) CreateUser(ctx context.Context, actorID string, req *dto.CreateUserRequest, ip, ua string) (*dto.UserResponse, error) {
	// Check existing email
	if existing, _ := s.repo.GetByEmail(ctx, req.Email); existing != nil {
		return nil, errors.New("a user with this email address already exists")
	}

	// Check existing username
	if existing, _ := s.repo.GetByUsername(ctx, req.Username); existing != nil {
		return nil, errors.New("this username is already taken")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &model.User{
		RoleID:       req.RoleID,
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		IsActive:     true,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}

	// Reload with Role
	freshUser, _ := s.repo.GetByID(ctx, user.ID)

	s.auditService.LogAction(ctx, &actorID, "CREATE_USER", "users", user.ID, nil, freshUser, ip, ua)

	return toUserResponse(freshUser), nil
}

func (s *userService) ListUsers(ctx context.Context, page, limit int) ([]dto.UserResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	users, total, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	var res []dto.UserResponse
	for _, u := range users {
		res = append(res, *toUserResponse(&u))
	}

	return res, total, nil
}

func (s *userService) GetUserByID(ctx context.Context, id string) (*dto.UserResponse, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toUserResponse(user), nil
}

func (s *userService) UpdateUserStatus(ctx context.Context, actorID, targetID string, isActive bool, ip, ua string) error {
	if actorID == targetID && !isActive {
		return errors.New("cannot deactivate your own administrator account")
	}

	user, err := s.repo.GetByID(ctx, targetID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("user not found")
		}
		return err
	}

	oldStatus := user.IsActive
	user.IsActive = isActive

	if err := s.repo.Update(ctx, user); err != nil {
		return err
	}

	s.auditService.LogAction(ctx, &actorID, "UPDATE_USER_STATUS", "users", targetID,
		map[string]interface{}{"is_active": oldStatus},
		map[string]interface{}{"is_active": isActive},
		ip, ua,
	)

	return nil
}

func (s *userService) GetRoles(ctx context.Context) ([]model.Role, error) {
	return s.repo.GetRoles(ctx)
}

func toUserResponse(u *model.User) *dto.UserResponse {
	return &dto.UserResponse{
		ID:        u.ID,
		RoleID:    u.RoleID,
		RoleName:  u.Role.Name,
		Username:  u.Username,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		IsActive:  u.IsActive,
		CreatedAt: u.CreatedAt,
	}
}
