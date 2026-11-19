package service

import (
	"context"
	"errors"

	"wholesale-management/internal/audit/service"
	"wholesale-management/internal/customers/dto"
	"wholesale-management/internal/customers/model"
	"wholesale-management/internal/customers/repository"
)

type CustomerService interface {
	GetOrCreateByPhone(ctx context.Context, name, phone, email, address string) (*model.Customer, error)
	GetProfileByUserID(ctx context.Context, userID string) (*dto.CustomerResponse, error)
	UpdateProfile(ctx context.Context, userID string, req *dto.CustomerProfileRequest, ip, ua string) (*dto.CustomerResponse, error)
	GetByID(ctx context.Context, id string) (*dto.CustomerResponse, error)
	List(ctx context.Context, search string, page, limit int) ([]dto.CustomerResponse, int64, error)
}

type customerService struct {
	repo         repository.CustomerRepository
	auditService service.AuditService
}

func NewCustomerService(repo repository.CustomerRepository, auditService service.AuditService) CustomerService {
	return &customerService{repo: repo, auditService: auditService}
}

func (s *customerService) GetOrCreateByPhone(ctx context.Context, name, phone, email, address string) (*model.Customer, error) {
	c, err := s.repo.GetByPhone(ctx, phone)
	if err == nil && c != nil {
		// Update details if provided
		if name != "" {
			c.Name = name
		}
		if email != "" && c.Email == "" {
			c.Email = email
		}
		if address != "" && c.DeliveryAddress == "" {
			c.DeliveryAddress = address
		}
		_ = s.repo.Update(ctx, c)
		return c, nil
	}

	newCustomer := &model.Customer{
		Name:            name,
		Phone:           phone,
		Email:           email,
		DeliveryAddress: address,
		IsActive:        true,
	}

	if err := s.repo.Create(ctx, newCustomer); err != nil {
		return nil, err
	}
	return newCustomer, nil
}

func (s *customerService) GetProfileByUserID(ctx context.Context, userID string) (*dto.CustomerResponse, error) {
	c, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, errors.New("customer profile not found for this user account")
	}

	orderCount, _ := s.repo.GetOrderCount(ctx, c.ID)
	return toCustomerResponse(c, orderCount), nil
}

func (s *customerService) UpdateProfile(ctx context.Context, userID string, req *dto.CustomerProfileRequest, ip, ua string) (*dto.CustomerResponse, error) {
	c, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, errors.New("customer profile not found")
	}

	oldVal := *c
	c.Name = req.Name
	c.Email = req.Email
	c.Phone = req.Phone
	c.BusinessName = req.BusinessName
	c.DeliveryAddress = req.DeliveryAddress

	if err := s.repo.Update(ctx, c); err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &userID, "UPDATE_CUSTOMER_PROFILE", "customers", c.ID, oldVal, c, ip, ua)

	orderCount, _ := s.repo.GetOrderCount(ctx, c.ID)
	return toCustomerResponse(c, orderCount), nil
}

func (s *customerService) GetByID(ctx context.Context, id string) (*dto.CustomerResponse, error) {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("customer not found")
	}
	orderCount, _ := s.repo.GetOrderCount(ctx, c.ID)
	return toCustomerResponse(c, orderCount), nil
}

func (s *customerService) List(ctx context.Context, search string, page, limit int) ([]dto.CustomerResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	list, total, err := s.repo.List(ctx, search, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	var res []dto.CustomerResponse
	for _, c := range list {
		orderCount, _ := s.repo.GetOrderCount(ctx, c.ID)
		res = append(res, *toCustomerResponse(&c, orderCount))
	}

	return res, total, nil
}

func toCustomerResponse(c *model.Customer, orderCount int64) *dto.CustomerResponse {
	return &dto.CustomerResponse{
		ID:              c.ID,
		UserID:          c.UserID,
		Name:            c.Name,
		Email:           c.Email,
		Phone:           c.Phone,
		BusinessName:    c.BusinessName,
		DeliveryAddress: c.DeliveryAddress,
		OrderCount:      orderCount,
		IsActive:        c.IsActive,
		CreatedAt:       c.CreatedAt,
	}
}
