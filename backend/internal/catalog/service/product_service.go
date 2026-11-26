package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"mime/multipart"
	"time"

	"distribution-management/internal/audit/service"
	"distribution-management/internal/catalog/dto"
	"distribution-management/internal/catalog/model"
	"distribution-management/internal/catalog/repository"
	invService "distribution-management/internal/inventory/service"
	"distribution-management/internal/platform/storage"

	"gorm.io/gorm"
)

type ProductService interface {
	Create(ctx context.Context, actorID string, req *dto.CreateProductRequest, ip, ua string) (*dto.ProductAdminResponse, error)
	Update(ctx context.Context, actorID string, id string, req *dto.UpdateProductRequest, ip, ua string) (*dto.ProductAdminResponse, error)
	Delete(ctx context.Context, actorID string, id string, ip, ua string) error
	GetAdminByID(ctx context.Context, id string) (*dto.ProductAdminResponse, error)
	GetPublicByID(ctx context.Context, id string) (*dto.ProductPublicResponse, error)
	ListAdmin(ctx context.Context, filter repository.ProductFilter) ([]dto.ProductAdminResponse, int64, error)
	ListPublic(ctx context.Context, filter repository.ProductFilter) ([]dto.ProductPublicResponse, int64, error)
	UploadImage(ctx context.Context, actorID string, productID string, file *multipart.FileHeader, isPrimary bool, ip, ua string) (*dto.ProductImageResponse, error)
	DeleteImage(ctx context.Context, actorID string, productID, imageID string, ip, ua string) error
}

type productService struct {
	repo         repository.ProductRepository
	categoryRepo repository.CategoryRepository
	invService   invService.InventoryService
	auditService service.AuditService
	storage      *storage.DiskStorage
	db           *gorm.DB
}

func NewProductService(
	repo repository.ProductRepository,
	categoryRepo repository.CategoryRepository,
	invService invService.InventoryService,
	auditService service.AuditService,
	storage *storage.DiskStorage,
	db *gorm.DB,
) ProductService {
	return &productService{
		repo:         repo,
		categoryRepo: categoryRepo,
		invService:   invService,
		auditService: auditService,
		storage:      storage,
		db:           db,
	}
}

func (s *productService) Create(ctx context.Context, actorID string, req *dto.CreateProductRequest, ip, ua string) (*dto.ProductAdminResponse, error) {
	// Validate category existence
	if _, err := s.categoryRepo.GetByID(ctx, req.CategoryID); err != nil {
		return nil, errors.New("selected category does not exist")
	}

	// Validate unique SKU
	if existing, _ := s.repo.GetBySKU(ctx, req.SKU); existing != nil {
		return nil, errors.New("a product with this SKU already exists")
	}

	slug := generateSlug(fmt.Sprintf("%s-%s", req.Name, req.SKU))
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	lowStock := 5
	if req.LowStockThreshold > 0 {
		lowStock = req.LowStockThreshold
	}

	minOrderQty := 1
	if req.MinOrderQuantity > 1 {
		minOrderQty = req.MinOrderQuantity
	}

	isDiscountEnabled := false
	if req.IsDiscountEnabled != nil {
		isDiscountEnabled = *req.IsDiscountEnabled
	}

	discountPercent := 0.0
	var discountStartDate *time.Time
	var discountEndDate *time.Time

	if isDiscountEnabled {
		if req.DiscountPercent <= 0 || req.DiscountPercent >= 100 {
			return nil, errors.New("discount percentage must be greater than 0 and less than 100")
		}
		discountPercent = math.Round(req.DiscountPercent*100) / 100
		if req.DiscountStartDate != nil && req.DiscountEndDate != nil && req.DiscountEndDate.Before(*req.DiscountStartDate) {
			return nil, errors.New("discount end date cannot be earlier than start date")
		}
		discountStartDate = req.DiscountStartDate
		discountEndDate = req.DiscountEndDate

		calculatedDiscount := math.Round(req.SellingPrice*(discountPercent/100.0)*100) / 100
		if req.SellingPrice-calculatedDiscount <= 0 {
			return nil, errors.New("discounted price must be greater than 0")
		}
	}

	product := &model.Product{
		CategoryID:        req.CategoryID,
		SKU:               req.SKU,
		Name:              req.Name,
		Slug:              slug,
		Description:       req.Description,
		UnitOfMeasure:     req.UnitOfMeasure,
		SellingPrice:      req.SellingPrice,
		CostPrice:         req.CostPrice,
		MinOrderQuantity:  minOrderQty,
		IsDiscountEnabled: isDiscountEnabled,
		DiscountPercent:   discountPercent,
		DiscountStartDate: discountStartDate,
		DiscountEndDate:   discountEndDate,
		IsActive:          isActive,
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Create(ctx, tx, product); err != nil {
			return err
		}

		// Initialize Stock
		if req.InitialStock > 0 {
			if err := s.invService.ReceiveStockTx(ctx, tx, product.ID, req.InitialStock, "INITIAL_SETUP", "Initial stock setup on product creation"); err != nil {
				return err
			}
		} else {
			// create zero stock row with threshold
			stock := &model.Product{
				ID: product.ID,
			}
			_ = stock
			if err := tx.Exec("INSERT INTO product_stock (product_id, current_stock, allocated_stock, low_stock_threshold) VALUES (?, 0, 0, ?)", product.ID, lowStock).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &actorID, "CREATE_PRODUCT", "products", product.ID, nil, product, ip, ua)

	freshProduct, err := s.repo.GetByID(ctx, product.ID)
	if err != nil {
		return nil, err
	}

	return toProductAdminResponse(freshProduct), nil
}

func (s *productService) Update(ctx context.Context, actorID string, id string, req *dto.UpdateProductRequest, ip, ua string) (*dto.ProductAdminResponse, error) {
	product, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("product not found")
	}

	oldVal := *product

	if req.CategoryID != product.CategoryID {
		if _, err := s.categoryRepo.GetByID(ctx, req.CategoryID); err != nil {
			return nil, errors.New("selected category does not exist")
		}
		product.CategoryID = req.CategoryID
	}

	product.Name = req.Name
	product.Description = req.Description
	product.UnitOfMeasure = req.UnitOfMeasure
	product.SellingPrice = req.SellingPrice
	product.CostPrice = req.CostPrice
	if req.MinOrderQuantity >= 1 {
		product.MinOrderQuantity = req.MinOrderQuantity
	}
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}

	if req.IsDiscountEnabled != nil {
		product.IsDiscountEnabled = *req.IsDiscountEnabled
	}
	if product.IsDiscountEnabled {
		if req.DiscountPercent <= 0 || req.DiscountPercent >= 100 {
			return nil, errors.New("discount percentage must be greater than 0 and less than 100")
		}
		product.DiscountPercent = math.Round(req.DiscountPercent*100) / 100
		if req.DiscountStartDate != nil && req.DiscountEndDate != nil && req.DiscountEndDate.Before(*req.DiscountStartDate) {
			return nil, errors.New("discount end date cannot be earlier than start date")
		}
		product.DiscountStartDate = req.DiscountStartDate
		product.DiscountEndDate = req.DiscountEndDate

		calculatedDiscount := math.Round(product.SellingPrice*(product.DiscountPercent/100.0)*100) / 100
		if product.SellingPrice-calculatedDiscount <= 0 {
			return nil, errors.New("discounted price must be greater than 0")
		}
	} else {
		product.IsDiscountEnabled = false
		product.DiscountPercent = 0
		product.DiscountStartDate = nil
		product.DiscountEndDate = nil
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(ctx, tx, product); err != nil {
			return err
		}

		if req.LowStockThreshold >= 0 {
			if err := tx.Exec("UPDATE product_stock SET low_stock_threshold = ? WHERE product_id = ?", req.LowStockThreshold, id).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &actorID, "UPDATE_PRODUCT", "products", id, oldVal, product, ip, ua)

	freshProduct, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return toProductAdminResponse(freshProduct), nil
}

func (s *productService) Delete(ctx context.Context, actorID string, id string, ip, ua string) error {
	product, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("product not found")
	}

	if product.Stock != nil && product.Stock.CurrentStock > 0 {
		return errors.New("cannot delete a product that still has inventory on hand. Please write off or adjust stock to zero first")
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	s.auditService.LogAction(ctx, &actorID, "DELETE_PRODUCT", "products", id, product, nil, ip, ua)

	return nil
}

func (s *productService) GetAdminByID(ctx context.Context, id string) (*dto.ProductAdminResponse, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toProductAdminResponse(p), nil
}

func (s *productService) GetPublicByID(ctx context.Context, id string) (*dto.ProductPublicResponse, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil || !p.IsActive {
		return nil, errors.New("product not found")
	}
	return toProductPublicResponse(p), nil
}

func (s *productService) ListAdmin(ctx context.Context, filter repository.ProductFilter) ([]dto.ProductAdminResponse, int64, error) {
	products, total, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	var res []dto.ProductAdminResponse
	for _, p := range products {
		res = append(res, *toProductAdminResponse(&p))
	}
	return res, total, nil
}

func (s *productService) ListPublic(ctx context.Context, filter repository.ProductFilter) ([]dto.ProductPublicResponse, int64, error) {
	filter.ActiveOnly = true
	products, total, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	var res []dto.ProductPublicResponse
	for _, p := range products {
		res = append(res, *toProductPublicResponse(&p))
	}
	return res, total, nil
}

func (s *productService) UploadImage(ctx context.Context, actorID string, productID string, file *multipart.FileHeader, isPrimary bool, ip, ua string) (*dto.ProductImageResponse, error) {
	if s.storage == nil {
		return nil, errors.New("file storage service is not configured")
	}

	// Enforce maximum 5 photos per product
	var existingCount int64
	if err := s.db.WithContext(ctx).Model(&model.ProductImage{}).Where("product_id = ?", productID).Count(&existingCount).Error; err != nil {
		return nil, err
	}
	if existingCount >= 5 {
		return nil, errors.New("maximum 5 photos allowed per product")
	}

	imageURL, err := s.storage.SaveImage(file)
	if err != nil {
		return nil, err
	}

	// If this is the first image, make it primary automatically
	if existingCount == 0 {
		isPrimary = true
	}

	image := &model.ProductImage{
		ProductID: productID,
		ImageURL:  imageURL,
		AltText:   file.Filename,
		IsPrimary: isPrimary,
		SortOrder: int(existingCount),
	}

	if err := s.repo.AddImage(ctx, image); err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &actorID, "UPLOAD_PRODUCT_IMAGE", "product_images", image.ID, nil, image, ip, ua)

	return &dto.ProductImageResponse{
		ID:        image.ID,
		ImageURL:  image.ImageURL,
		AltText:   image.AltText,
		IsPrimary: image.IsPrimary,
	}, nil
}

func (s *productService) DeleteImage(ctx context.Context, actorID string, productID, imageID string, ip, ua string) error {
	// If the deleted image was primary, designate another image as primary
	var img model.ProductImage
	if err := s.db.WithContext(ctx).Where("id = ? AND product_id = ?", imageID, productID).First(&img).Error; err == nil {
		if img.IsPrimary {
			_ = s.db.WithContext(ctx).Model(&model.ProductImage{}).
				Where("product_id = ? AND id != ?", productID, imageID).
				Order("sort_order ASC, created_at ASC").
				Limit(1).
				Update("is_primary", true).Error
		}
	}

	if err := s.repo.DeleteImage(ctx, imageID); err != nil {
		return err
	}
	s.auditService.LogAction(ctx, &actorID, "DELETE_PRODUCT_IMAGE", "product_images", imageID, map[string]string{"product_id": productID}, nil, ip, ua)
	return nil
}

func toProductAdminResponse(p *model.Product) *dto.ProductAdminResponse {
	var images []dto.ProductImageResponse
	for _, img := range p.Images {
		images = append(images, dto.ProductImageResponse{
			ID:        img.ID,
			ImageURL:  img.ImageURL,
			AltText:   img.AltText,
			IsPrimary: img.IsPrimary,
		})
	}

	currentStock := 0
	allocatedStock := 0
	availableStock := 0
	lowStockThreshold := 5
	isLowStock := false

	if p.Stock != nil {
		currentStock = p.Stock.CurrentStock
		allocatedStock = p.Stock.AllocatedStock
		availableStock = p.Stock.AvailableStock()
		lowStockThreshold = p.Stock.LowStockThreshold
		isLowStock = availableStock <= lowStockThreshold
	}

	minOrderQty := 1
	if p.MinOrderQuantity > 1 {
		minOrderQty = p.MinOrderQuantity
	}

	now := time.Now()
	effPrice, discAmt, _, isDiscActive := p.EffectivePrice(now)
	discStatus := p.DiscountStatus(now)

	return &dto.ProductAdminResponse{
		ID:                p.ID,
		CategoryID:        p.CategoryID,
		CategoryName:      p.Category.Name,
		SKU:               p.SKU,
		Name:              p.Name,
		Slug:              p.Slug,
		Description:       p.Description,
		UnitOfMeasure:     p.UnitOfMeasure,
		SellingPrice:      p.SellingPrice,
		CostPrice:         p.CostPrice,
		MinOrderQuantity:  minOrderQty,
		IsDiscountEnabled: p.IsDiscountEnabled,
		DiscountPercent:   p.DiscountPercent,
		DiscountStartDate: p.DiscountStartDate,
		DiscountEndDate:   p.DiscountEndDate,
		DiscountedPrice:   effPrice,
		DiscountAmount:    discAmt,
		IsDiscountActive:  isDiscActive,
		DiscountStatus:    discStatus,
		CurrentStock:      currentStock,
		AllocatedStock:    allocatedStock,
		AvailableStock:    availableStock,
		LowStockThreshold: lowStockThreshold,
		IsLowStock:        isLowStock,
		IsActive:          p.IsActive,
		Images:            images,
		CreatedAt:         p.CreatedAt,
		UpdatedAt:         p.UpdatedAt,
	}
}

func toProductPublicResponse(p *model.Product) *dto.ProductPublicResponse {
	var images []dto.ProductImageResponse
	for _, img := range p.Images {
		images = append(images, dto.ProductImageResponse{
			ID:        img.ID,
			ImageURL:  img.ImageURL,
			AltText:   img.AltText,
			IsPrimary: img.IsPrimary,
		})
	}

	inStock := false
	availStock := 0
	if p.Stock != nil {
		availStock = p.Stock.AvailableStock()
		if availStock > 0 {
			inStock = true
		}
	}

	minOrderQty := 1
	if p.MinOrderQuantity > 1 {
		minOrderQty = p.MinOrderQuantity
	}

	now := time.Now()
	effPrice, discAmt, discPct, isDiscActive := p.EffectivePrice(now)
	discStatus := p.DiscountStatus(now)
	if !isDiscActive && discStatus == "ACTIVE" {
		discStatus = "DISABLED"
	}

	return &dto.ProductPublicResponse{
		ID:                p.ID,
		CategoryID:        p.CategoryID,
		CategoryName:      p.Category.Name,
		SKU:               p.SKU,
		Name:              p.Name,
		Slug:              p.Slug,
		Description:       p.Description,
		UnitOfMeasure:     p.UnitOfMeasure,
		SellingPrice:      p.SellingPrice,
		MinOrderQuantity:  minOrderQty,
		IsDiscountEnabled: p.IsDiscountEnabled,
		IsDiscountActive:  isDiscActive,
		DiscountStatus:    discStatus,
		DiscountPercent:   discPct,
		DiscountedPrice:   effPrice,
		DiscountAmount:    discAmt,
		DiscountStartDate: p.DiscountStartDate,
		DiscountEndDate:   p.DiscountEndDate,
		InStock:           inStock,
		AvailableStock:    availStock,
		Images:            images,
	}
}
