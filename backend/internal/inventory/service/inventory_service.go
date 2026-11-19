package service

import (
	"context"
	"errors"
	"fmt"

	"wholesale-management/internal/audit/service"
	"wholesale-management/internal/inventory/dto"
	"wholesale-management/internal/inventory/model"
	"wholesale-management/internal/inventory/repository"

	"gorm.io/gorm"
)

var (
	ErrInsufficientStock = errors.New("insufficient stock available for this operation")
	ErrInvalidQuantity   = errors.New("quantity must be greater than zero")
)

type InventoryService interface {
	GetStock(ctx context.Context, productID string) (*model.ProductStock, error)
	AdjustStock(ctx context.Context, actorID string, req *dto.StockAdjustmentRequest, ip, ua string) error
	ReceiveStockTx(ctx context.Context, tx *gorm.DB, productID string, qty int, refID, notes string) error
	AllocateStockTx(ctx context.Context, tx *gorm.DB, productID string, qty int, refID, notes string) error
	DeductAllocatedStockTx(ctx context.Context, tx *gorm.DB, productID string, qty int, refID, notes string) error
	CancelOrderRestockTx(ctx context.Context, tx *gorm.DB, productID string, qty int, refID, notes string) error
	ListMovements(ctx context.Context, productID, movementType string, page, limit int) ([]model.StockMovement, int64, error)
	GetLowStockItems(ctx context.Context) ([]model.ProductStock, error)
}

type inventoryService struct {
	repo         repository.InventoryRepository
	auditService service.AuditService
	db           *gorm.DB
}

func NewInventoryService(repo repository.InventoryRepository, auditService service.AuditService, db *gorm.DB) InventoryService {
	return &inventoryService{
		repo:         repo,
		auditService: auditService,
		db:           db,
	}
}

func (s *inventoryService) GetStock(ctx context.Context, productID string) (*model.ProductStock, error) {
	return s.repo.GetStock(ctx, productID)
}

func (s *inventoryService) AdjustStock(ctx context.Context, actorID string, req *dto.StockAdjustmentRequest, ip, ua string) error {
	if req.QuantityChanged == 0 {
		return errors.New("adjustment quantity cannot be zero")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		stock, err := s.repo.GetStockForUpdate(ctx, tx, req.ProductID)
		if err != nil {
			return fmt.Errorf("failed to retrieve product stock: %w", err)
		}

		newCurrent := stock.CurrentStock + req.QuantityChanged
		if newCurrent < stock.AllocatedStock {
			return errors.New("adjustment would cause current stock to drop below already allocated stock")
		}
		if newCurrent < 0 {
			return errors.New("stock cannot be adjusted to a negative quantity")
		}

		before := stock.CurrentStock
		stock.CurrentStock = newCurrent

		if err := s.repo.SaveStock(ctx, tx, stock); err != nil {
			return err
		}

		movement := &model.StockMovement{
			ProductID:       req.ProductID,
			UserID:          &actorID,
			MovementType:    "ADJUSTMENT",
			QuantityChanged: req.QuantityChanged,
			QuantityBefore:  before,
			QuantityAfter:   newCurrent,
			ReferenceID:     fmt.Sprintf("ADJ-%s", req.Reason),
			Notes:           req.Notes,
		}

		if err := s.repo.CreateMovement(ctx, tx, movement); err != nil {
			return err
		}

		s.auditService.LogAction(ctx, &actorID, "STOCK_ADJUSTMENT", "product_stock", req.ProductID,
			map[string]int{"current_stock": before},
			map[string]int{"current_stock": newCurrent},
			ip, ua,
		)

		return nil
	})
}

func (s *inventoryService) ReceiveStockTx(ctx context.Context, tx *gorm.DB, productID string, qty int, refID, notes string) error {
	if qty <= 0 {
		return ErrInvalidQuantity
	}

	stock, err := s.repo.GetStockForUpdate(ctx, tx, productID)
	if err != nil {
		// If stock record doesn't exist yet, initialize it
		stock = &model.ProductStock{
			ProductID:         productID,
			CurrentStock:      0,
			AllocatedStock:    0,
			LowStockThreshold: 5,
		}
	}

	before := stock.CurrentStock
	stock.CurrentStock += qty

	if err := s.repo.SaveStock(ctx, tx, stock); err != nil {
		return err
	}

	movement := &model.StockMovement{
		ProductID:       productID,
		MovementType:    "RECEIVING",
		QuantityChanged: qty,
		QuantityBefore:  before,
		QuantityAfter:   stock.CurrentStock,
		ReferenceID:     refID,
		Notes:           notes,
	}

	return s.repo.CreateMovement(ctx, tx, movement)
}

func (s *inventoryService) AllocateStockTx(ctx context.Context, tx *gorm.DB, productID string, qty int, refID, notes string) error {
	if qty <= 0 {
		return ErrInvalidQuantity
	}

	stock, err := s.repo.GetStockForUpdate(ctx, tx, productID)
	if err != nil {
		return fmt.Errorf("failed to load stock for product %s: %w", productID, err)
	}

	if stock.AvailableStock() < qty {
		return fmt.Errorf("%w: available %d, requested %d", ErrInsufficientStock, stock.AvailableStock(), qty)
	}

	beforeAllocated := stock.AllocatedStock
	stock.AllocatedStock += qty

	if err := s.repo.SaveStock(ctx, tx, stock); err != nil {
		return err
	}

	movement := &model.StockMovement{
		ProductID:       productID,
		MovementType:    "ORDER_ALLOCATION",
		QuantityChanged: -qty, // reservation
		QuantityBefore:  stock.CurrentStock - beforeAllocated,
		QuantityAfter:   stock.AvailableStock(),
		ReferenceID:     refID,
		Notes:           notes,
	}

	return s.repo.CreateMovement(ctx, tx, movement)
}

func (s *inventoryService) DeductAllocatedStockTx(ctx context.Context, tx *gorm.DB, productID string, qty int, refID, notes string) error {
	stock, err := s.repo.GetStockForUpdate(ctx, tx, productID)
	if err != nil {
		return err
	}

	beforeCurrent := stock.CurrentStock
	stock.CurrentStock -= qty
	stock.AllocatedStock -= qty
	if stock.AllocatedStock < 0 {
		stock.AllocatedStock = 0
	}
	if stock.CurrentStock < 0 {
		stock.CurrentStock = 0
	}

	if err := s.repo.SaveStock(ctx, tx, stock); err != nil {
		return err
	}

	movement := &model.StockMovement{
		ProductID:       productID,
		MovementType:    "ORDER_DEDUCTION",
		QuantityChanged: -qty,
		QuantityBefore:  beforeCurrent,
		QuantityAfter:   stock.CurrentStock,
		ReferenceID:     refID,
		Notes:           notes,
	}

	return s.repo.CreateMovement(ctx, tx, movement)
}

func (s *inventoryService) CancelOrderRestockTx(ctx context.Context, tx *gorm.DB, productID string, qty int, refID, notes string) error {
	stock, err := s.repo.GetStockForUpdate(ctx, tx, productID)
	if err != nil {
		return err
	}

	stock.AllocatedStock -= qty
	if stock.AllocatedStock < 0 {
		stock.AllocatedStock = 0
	}

	if err := s.repo.SaveStock(ctx, tx, stock); err != nil {
		return err
	}

	movement := &model.StockMovement{
		ProductID:       productID,
		MovementType:    "CANCELLATION_RESTOCK",
		QuantityChanged: qty,
		QuantityBefore:  stock.AvailableStock() - qty,
		QuantityAfter:   stock.AvailableStock(),
		ReferenceID:     refID,
		Notes:           notes,
	}

	return s.repo.CreateMovement(ctx, tx, movement)
}

func (s *inventoryService) ListMovements(ctx context.Context, productID, movementType string, page, limit int) ([]model.StockMovement, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	return s.repo.ListMovements(ctx, productID, movementType, limit, offset)
}

func (s *inventoryService) GetLowStockItems(ctx context.Context) ([]model.ProductStock, error) {
	return s.repo.GetLowStockItems(ctx)
}
