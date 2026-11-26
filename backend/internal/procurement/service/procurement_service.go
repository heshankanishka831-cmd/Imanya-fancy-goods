package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"distribution-management/internal/audit/service"
	invService "distribution-management/internal/inventory/service"
	"distribution-management/internal/procurement/dto"
	"distribution-management/internal/procurement/model"
	"distribution-management/internal/procurement/repository"
	supplierRepo "distribution-management/internal/suppliers/repository"

	"gorm.io/gorm"
)

type ProcurementService interface {
	CreatePO(ctx context.Context, actorID string, req *dto.CreatePORequest, ip, ua string) (*dto.POResponse, error)
	UpdatePOStatus(ctx context.Context, actorID, poID, status string, ip, ua string) (*dto.POResponse, error)
	CreateGoodsReceipt(ctx context.Context, actorID string, req *dto.CreateGoodsReceiptRequest, ip, ua string) (*dto.POResponse, error)
	GetPOByID(ctx context.Context, id string) (*dto.POResponse, error)
	ListPOs(ctx context.Context, status, supplierID string, page, limit int) ([]dto.POResponse, int64, error)
}

type procurementService struct {
	repo         repository.ProcurementRepository
	supplierRepo supplierRepo.SupplierRepository
	invService   invService.InventoryService
	auditService service.AuditService
	db           *gorm.DB
}

func NewProcurementService(
	repo repository.ProcurementRepository,
	supplierRepo supplierRepo.SupplierRepository,
	invService invService.InventoryService,
	auditService service.AuditService,
	db *gorm.DB,
) ProcurementService {
	return &procurementService{
		repo:         repo,
		supplierRepo: supplierRepo,
		invService:   invService,
		auditService: auditService,
		db:           db,
	}
}

func (s *procurementService) CreatePO(ctx context.Context, actorID string, req *dto.CreatePORequest, ip, ua string) (*dto.POResponse, error) {
	// Verify supplier exists
	if _, err := s.supplierRepo.GetByID(ctx, req.SupplierID); err != nil {
		return nil, errors.New("selected supplier does not exist")
	}

	poNumber, err := s.repo.GetNextPONumber(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to generate purchase order number: %w", err)
	}

	var expectedDate *time.Time
	if req.ExpectedDeliveryDate != nil && *req.ExpectedDeliveryDate != "" {
		if t, err := time.Parse("2006-01-02", *req.ExpectedDeliveryDate); err == nil {
			expectedDate = &t
		}
	}

	var totalAmount float64
	var items []model.PurchaseOrderItem

	for _, itemReq := range req.Items {
		subtotal := float64(itemReq.QuantityOrdered) * itemReq.UnitCost
		totalAmount += subtotal

		items = append(items, model.PurchaseOrderItem{
			ProductID:        itemReq.ProductID,
			QuantityOrdered:  itemReq.QuantityOrdered,
			QuantityReceived: 0,
			UnitCost:         itemReq.UnitCost,
			Subtotal:         subtotal,
		})
	}

	po := &model.PurchaseOrder{
		PONumber:             poNumber,
		SupplierID:           req.SupplierID,
		CreatedBy:            actorID,
		Status:               "DRAFT",
		TotalAmount:          totalAmount,
		ExpectedDeliveryDate: expectedDate,
		Notes:                req.Notes,
		Items:                items,
	}

	if err := s.repo.CreatePO(ctx, nil, po); err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &actorID, "CREATE_PURCHASE_ORDER", "purchase_orders", po.ID, nil, po, ip, ua)

	return s.GetPOByID(ctx, po.ID)
}

func (s *procurementService) UpdatePOStatus(ctx context.Context, actorID, poID, status string, ip, ua string) (*dto.POResponse, error) {
	po, err := s.repo.GetPOByID(ctx, poID)
	if err != nil {
		return nil, errors.New("purchase order not found")
	}

	// Validate status transition
	if po.Status == "COMPLETED" || po.Status == "CANCELLED" {
		return nil, fmt.Errorf("cannot alter purchase order that is already in '%s' status", po.Status)
	}

	if status != "DRAFT" && status != "ORDERED" && status != "CANCELLED" {
		return nil, errors.New("invalid status transition target")
	}

	oldStatus := po.Status
	po.Status = status

	if err := s.repo.UpdatePO(ctx, nil, po); err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &actorID, "UPDATE_PO_STATUS", "purchase_orders", po.ID,
		map[string]string{"status": oldStatus},
		map[string]string{"status": status},
		ip, ua,
	)

	return s.GetPOByID(ctx, po.ID)
}

func (s *procurementService) CreateGoodsReceipt(ctx context.Context, actorID string, req *dto.CreateGoodsReceiptRequest, ip, ua string) (*dto.POResponse, error) {
	grnNumber, err := s.repo.GetNextReceiptNumber(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to generate goods receipt number: %w", err)
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		po, err := s.repo.GetPOForUpdate(ctx, tx, req.PurchaseOrderID)
		if err != nil {
			return errors.New("purchase order not found")
		}

		if po.Status != "ORDERED" && po.Status != "PARTIALLY_RECEIVED" {
			return fmt.Errorf("goods can only be received for orders in ORDERED or PARTIALLY_RECEIVED status (current: %s)", po.Status)
		}

		itemsMap := make(map[string]*model.PurchaseOrderItem)
		for i := range po.Items {
			itemsMap[po.Items[i].ProductID] = &po.Items[i]
		}

		var grItems []model.GoodsReceiptItem

		for _, itemReq := range req.Items {
			poItem, exists := itemsMap[itemReq.ProductID]
			if !exists {
				return fmt.Errorf("product ID %s was not ordered in this purchase order", itemReq.ProductID)
			}

			remainingAllowed := poItem.QuantityOrdered - poItem.QuantityReceived
			if itemReq.QuantityReceived > remainingAllowed {
				return fmt.Errorf("received quantity (%d) exceeds remaining ordered quantity (%d) for product %s",
					itemReq.QuantityReceived, remainingAllowed, itemReq.ProductID)
			}

			poItem.QuantityReceived += itemReq.QuantityReceived
			if err := tx.Save(poItem).Error; err != nil {
				return err
			}

			// Add stock & ledger movement via inventory service
			refID := fmt.Sprintf("%s (%s)", grnNumber, po.PONumber)
			notes := fmt.Sprintf("Received from supplier %s", po.SupplierID)
			if err := s.invService.ReceiveStockTx(ctx, tx, itemReq.ProductID, itemReq.QuantityReceived, refID, notes); err != nil {
				return err
			}

			grItems = append(grItems, model.GoodsReceiptItem{
				ProductID:        itemReq.ProductID,
				QuantityReceived: itemReq.QuantityReceived,
			})
		}

		// Check if PO is completely fulfilled
		allFulfilled := true
		for _, item := range po.Items {
			if item.QuantityReceived < item.QuantityOrdered {
				allFulfilled = false
				break
			}
		}

		if allFulfilled {
			po.Status = "COMPLETED"
		} else {
			po.Status = "PARTIALLY_RECEIVED"
		}

		if err := s.repo.UpdatePO(ctx, tx, po); err != nil {
			return err
		}

		gr := &model.GoodsReceipt{
			ReceiptNumber:   grnNumber,
			PurchaseOrderID: po.ID,
			ReceivedBy:      actorID,
			Notes:           req.Notes,
			Items:           grItems,
		}

		if err := s.repo.CreateGoodsReceipt(ctx, tx, gr); err != nil {
			return err
		}

		s.auditService.LogAction(ctx, &actorID, "CREATE_GOODS_RECEIPT", "goods_receipts", gr.ID, nil, gr, ip, ua)

		return nil
	})

	if err != nil {
		return nil, err
	}

	return s.GetPOByID(ctx, req.PurchaseOrderID)
}

func (s *procurementService) GetPOByID(ctx context.Context, id string) (*dto.POResponse, error) {
	po, err := s.repo.GetPOByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toPOResponse(po), nil
}

func (s *procurementService) ListPOs(ctx context.Context, status, supplierID string, page, limit int) ([]dto.POResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	list, total, err := s.repo.ListPOs(ctx, status, supplierID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	var res []dto.POResponse
	for _, po := range list {
		res = append(res, *toPOResponse(&po))
	}

	return res, total, nil
}

func toPOResponse(po *model.PurchaseOrder) *dto.POResponse {
	var items []dto.POItemResponse
	for _, it := range po.Items {
		items = append(items, dto.POItemResponse{
			ID:               it.ID,
			ProductID:        it.ProductID,
			ProductName:      it.Product.Name,
			ProductSKU:       it.Product.SKU,
			QuantityOrdered:  it.QuantityOrdered,
			QuantityReceived: it.QuantityReceived,
			UnitCost:         it.UnitCost,
			Subtotal:         it.Subtotal,
		})
	}

	var receipts []dto.GoodsReceiptResponse
	for _, r := range po.Receipts {
		receiverName := fmt.Sprintf("%s %s", r.Receiver.FirstName, r.Receiver.LastName)
		receipts = append(receipts, dto.GoodsReceiptResponse{
			ID:            r.ID,
			ReceiptNumber: r.ReceiptNumber,
			ReceivedBy:    r.ReceivedBy,
			ReceiverName:  receiverName,
			ReceivedAt:    r.ReceivedAt,
			Notes:         r.Notes,
		})
	}

	creatorName := fmt.Sprintf("%s %s", po.Creator.FirstName, po.Creator.LastName)

	return &dto.POResponse{
		ID:                   po.ID,
		PONumber:             po.PONumber,
		SupplierID:           po.SupplierID,
		SupplierName:         po.Supplier.Name,
		CreatedBy:            po.CreatedBy,
		CreatorName:          creatorName,
		Status:               po.Status,
		TotalAmount:          po.TotalAmount,
		ExpectedDeliveryDate: po.ExpectedDeliveryDate,
		Notes:                po.Notes,
		Items:                items,
		Receipts:             receipts,
		CreatedAt:            po.CreatedAt,
		UpdatedAt:            po.UpdatedAt,
	}
}
