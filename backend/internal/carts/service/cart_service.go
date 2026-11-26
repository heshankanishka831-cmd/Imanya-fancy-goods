package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"distribution-management/internal/carts/dto"
	"distribution-management/internal/carts/model"
	"distribution-management/internal/carts/repository"
	catalogRepo "distribution-management/internal/catalog/repository"
	invService "distribution-management/internal/inventory/service"
)

type CartService interface {
	GetOrCreateCart(ctx context.Context, sessionID string, customerID *string) (*model.Cart, error)
	GetCart(ctx context.Context, sessionID string, customerID *string) (*dto.CartResponse, error)
	AddItem(ctx context.Context, sessionID string, customerID *string, req *dto.AddToCartRequest) (*dto.CartResponse, error)
	UpdateItem(ctx context.Context, itemID string, quantity int) (*dto.CartResponse, error)
	DeleteItem(ctx context.Context, itemID string) error
	GetCartByID(ctx context.Context, cartID string) (*model.Cart, error)
}

type cartService struct {
	repo        repository.CartRepository
	productRepo catalogRepo.ProductRepository
	invService  invService.InventoryService
}

func NewCartService(repo repository.CartRepository, productRepo catalogRepo.ProductRepository, invService invService.InventoryService) CartService {
	return &cartService{
		repo:        repo,
		productRepo: productRepo,
		invService:  invService,
	}
}

func (s *cartService) GetOrCreateCart(ctx context.Context, sessionID string, customerID *string) (*model.Cart, error) {
	cart, err := s.repo.GetBySessionOrCustomer(ctx, sessionID, customerID)
	if err == nil && cart != nil {
		return cart, nil
	}

	newCart := &model.Cart{
		SessionID:  sessionID,
		CustomerID: customerID,
	}

	if err := s.repo.Create(ctx, newCart); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, newCart.ID)
}

func (s *cartService) GetCart(ctx context.Context, sessionID string, customerID *string) (*dto.CartResponse, error) {
	cart, err := s.GetOrCreateCart(ctx, sessionID, customerID)
	if err != nil {
		return nil, err
	}
	return toCartResponse(cart), nil
}

func (s *cartService) AddItem(ctx context.Context, sessionID string, customerID *string, req *dto.AddToCartRequest) (*dto.CartResponse, error) {
	product, err := s.productRepo.GetByID(ctx, req.ProductID)
	if err != nil || !product.IsActive {
		return nil, errors.New("product is not available for purchase")
	}

	minQty := 1
	if product.MinOrderQuantity > 1 {
		minQty = product.MinOrderQuantity
	}
	if req.Quantity < minQty {
		return nil, fmt.Errorf("product %q requires a minimum order quantity of %d units (requested: %d)", product.Name, minQty, req.Quantity)
	}

	stock, err := s.invService.GetStock(ctx, req.ProductID)
	if err != nil || stock.AvailableStock() < req.Quantity {
		return nil, errors.New("requested quantity exceeds currently available stock")
	}

	cart, err := s.GetOrCreateCart(ctx, sessionID, customerID)
	if err != nil {
		return nil, err
	}

	existingItem, err := s.repo.GetItem(ctx, cart.ID, req.ProductID)
	if err == nil && existingItem != nil {
		newQty := existingItem.Quantity + req.Quantity
		if stock.AvailableStock() < newQty {
			return nil, fmt.Errorf("cannot add %d more; only %d total available in stock", req.Quantity, stock.AvailableStock())
		}
		existingItem.Quantity = newQty
		if err := s.repo.UpdateItem(ctx, existingItem); err != nil {
			return nil, err
		}
	} else {
		item := &model.CartItem{
			CartID:    cart.ID,
			ProductID: req.ProductID,
			Quantity:  req.Quantity,
		}
		if err := s.repo.AddItem(ctx, item); err != nil {
			return nil, err
		}
	}

	freshCart, err := s.repo.GetByID(ctx, cart.ID)
	if err != nil {
		return nil, err
	}

	return toCartResponse(freshCart), nil
}

func (s *cartService) UpdateItem(ctx context.Context, itemID string, quantity int) (*dto.CartResponse, error) {
	item, err := s.repo.GetItemByID(ctx, itemID)
	if err != nil {
		return nil, errors.New("cart item not found")
	}

	product, err := s.productRepo.GetByID(ctx, item.ProductID)
	if err == nil && product != nil {
		minQty := 1
		if product.MinOrderQuantity > 1 {
			minQty = product.MinOrderQuantity
		}
		if quantity < minQty {
			return nil, fmt.Errorf("product %q requires a minimum order quantity of %d units", product.Name, minQty)
		}
	}

	stock, err := s.invService.GetStock(ctx, item.ProductID)
	if err != nil || stock.AvailableStock() < quantity {
		return nil, errors.New("requested quantity exceeds available stock")
	}

	item.Quantity = quantity
	if err := s.repo.UpdateItem(ctx, item); err != nil {
		return nil, err
	}

	freshCart, err := s.repo.GetByID(ctx, item.CartID)
	if err != nil {
		return nil, err
	}

	return toCartResponse(freshCart), nil
}

func (s *cartService) DeleteItem(ctx context.Context, itemID string) error {
	return s.repo.DeleteItem(ctx, itemID)
}

func (s *cartService) GetCartByID(ctx context.Context, cartID string) (*model.Cart, error) {
	return s.repo.GetByID(ctx, cartID)
}

func toCartResponse(cart *model.Cart) *dto.CartResponse {
	var items []dto.CartItemResponse
	var totalAmount float64
	var originalTotal float64
	totalItems := 0
	now := time.Now()

	for _, it := range cart.Items {
		effPrice, discAmt, discPct, isDiscActive := it.Product.EffectivePrice(now)
		lineSubtotal := math.Round(float64(it.Quantity)*effPrice*100) / 100
		lineOriginal := math.Round(float64(it.Quantity)*it.Product.SellingPrice*100) / 100

		totalAmount = math.Round((totalAmount+lineSubtotal)*100) / 100
		originalTotal = math.Round((originalTotal+lineOriginal)*100) / 100
		totalItems += it.Quantity

		imgURL := ""
		if len(it.Product.Images) > 0 {
			imgURL = it.Product.Images[0].ImageURL
		}

		available := 0
		if it.Product.Stock != nil {
			available = it.Product.Stock.AvailableStock()
		}

		minOrderQty := 1
		if it.Product.MinOrderQuantity > 1 {
			minOrderQty = it.Product.MinOrderQuantity
		}

		items = append(items, dto.CartItemResponse{
			ID:               it.ID,
			ProductID:        it.ProductID,
			ProductName:      it.Product.Name,
			ProductSKU:       it.Product.SKU,
			ProductImage:     imgURL,
			UnitOfMeasure:    it.Product.UnitOfMeasure,
			OriginalPrice:    it.Product.SellingPrice,
			UnitPrice:        effPrice,
			DiscountPercent:  discPct,
			DiscountAmount:   discAmt,
			IsDiscountActive: isDiscActive,
			MinOrderQuantity: minOrderQty,
			Quantity:         it.Quantity,
			Subtotal:         lineSubtotal,
			AvailableStock:   available,
		})
	}

	totalSavings := math.Round((originalTotal-totalAmount)*100) / 100
	if totalSavings < 0 {
		totalSavings = 0
	}

	return &dto.CartResponse{
		ID:            cart.ID,
		Items:         items,
		TotalItems:    totalItems,
		TotalAmount:   totalAmount,
		OriginalTotal: originalTotal,
		TotalSavings:  totalSavings,
	}
}
