package service

import (
	"context"
	"errors"

	"wholesale-management/internal/audit/service"
	"wholesale-management/internal/suppliers/dto"
	"wholesale-management/internal/suppliers/model"
	"wholesale-management/internal/suppliers/repository"
)

type SupplierService interface {
	Create(ctx context.Context, actorID string, req *dto.SupplierRequest, ip, ua string) (*dto.SupplierResponse, error)
	Update(ctx context.Context, actorID, id string, req *dto.SupplierRequest, ip, ua string) (*dto.SupplierResponse, error)
	Delete(ctx context.Context, actorID, id string, ip, ua string) error
	GetByID(ctx context.Context, id string) (*dto.SupplierResponse, error)
	List(ctx context.Context, activeOnly bool, page, limit int) ([]dto.SupplierResponse, int64, error)
}

type supplierService struct {
	repo         repository.SupplierRepository
	auditService service.AuditService
}

func NewSupplierService(repo repository.SupplierRepository, auditService service.AuditService) SupplierService {
	return &supplierService{repo: repo, auditService: auditService}
}

func (s *supplierService) Create(ctx context.Context, actorID string, req *dto.SupplierRequest, ip, ua string) (*dto.SupplierResponse, error) {
	if existing, _ := s.repo.GetByName(ctx, req.Name); existing != nil {
		return nil, errors.New("a supplier with this name already exists")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	supplier := &model.Supplier{
		Name:          req.Name,
		ContactPerson: req.ContactPerson,
		Email:         req.Email,
		Phone:         req.Phone,
		Address:       req.Address,
		IsActive:      isActive,
	}

	if err := s.repo.Create(ctx, supplier); err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &actorID, "CREATE_SUPPLIER", "suppliers", supplier.ID, nil, supplier, ip, ua)

	return toSupplierResponse(supplier), nil
}

func (s *supplierService) Update(ctx context.Context, actorID, id string, req *dto.SupplierRequest, ip, ua string) (*dto.SupplierResponse, error) {
	supplier, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("supplier not found")
	}

	oldVal := *supplier

	supplier.Name = req.Name
	supplier.ContactPerson = req.ContactPerson
	supplier.Email = req.Email
	supplier.Phone = req.Phone
	supplier.Address = req.Address
	if req.IsActive != nil {
		supplier.IsActive = *req.IsActive
	}

	if err := s.repo.Update(ctx, supplier); err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &actorID, "UPDATE_SUPPLIER", "suppliers", id, oldVal, supplier, ip, ua)

	return toSupplierResponse(supplier), nil
}

func (s *supplierService) Delete(ctx context.Context, actorID, id string, ip, ua string) error {
	hasPOs, err := s.repo.HasPurchaseOrders(ctx, id)
	if err != nil {
		return err
	}
	if hasPOs {
		return errors.New("cannot delete supplier with linked purchase orders. Deactivate the supplier instead")
	}

	supplier, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("supplier not found")
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	s.auditService.LogAction(ctx, &actorID, "DELETE_SUPPLIER", "suppliers", id, supplier, nil, ip, ua)

	return nil
}

func (s *supplierService) GetByID(ctx context.Context, id string) (*dto.SupplierResponse, error) {
	supplier, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toSupplierResponse(supplier), nil
}

func (s *supplierService) List(ctx context.Context, activeOnly bool, page, limit int) ([]dto.SupplierResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	list, total, err := s.repo.List(ctx, activeOnly, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	var res []dto.SupplierResponse
	for _, sup := range list {
		res = append(res, *toSupplierResponse(&sup))
	}
	return res, total, nil
}

func toSupplierResponse(s *model.Supplier) *dto.SupplierResponse {
	return &dto.SupplierResponse{
		ID:            s.ID,
		Name:          s.Name,
		ContactPerson: s.ContactPerson,
		Email:         s.Email,
		Phone:         s.Phone,
		Address:       s.Address,
		IsActive:      s.IsActive,
		CreatedAt:     s.CreatedAt,
	}
}
