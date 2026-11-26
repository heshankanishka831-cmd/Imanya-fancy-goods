package service_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	auditModel "distribution-management/internal/audit/model"
	cartRepo "distribution-management/internal/carts/repository"
	cartService "distribution-management/internal/carts/service"
	cartDto "distribution-management/internal/carts/dto"
	"distribution-management/internal/catalog/dto"
	"distribution-management/internal/catalog/handler"
	"distribution-management/internal/catalog/repository"
	catalogService "distribution-management/internal/catalog/service"
	"distribution-management/internal/config"
	customerRepo "distribution-management/internal/customers/repository"
	customerService "distribution-management/internal/customers/service"
	invRepo "distribution-management/internal/inventory/repository"
	invService "distribution-management/internal/inventory/service"
	loyaltyRepo "distribution-management/internal/loyalty/repository"
	loyaltyService "distribution-management/internal/loyalty/service"
	orderDto "distribution-management/internal/orders/dto"
	orderRepo "distribution-management/internal/orders/repository"
	orderService "distribution-management/internal/orders/service"
	"distribution-management/internal/platform/database"
	"distribution-management/internal/platform/logger"
	whatsappService "distribution-management/internal/whatsapp/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/stretchr/testify/require"
)

type noopAuditService struct{}

func (n *noopAuditService) LogAction(ctx context.Context, userID *string, action, entityName, entityID string, oldVal, newVal interface{}, ip, userAgent string) {
}

func (n *noopAuditService) ListLogs(ctx context.Context, entityName string, page, limit int) ([]auditModel.AuditLog, int64, error) {
	return nil, 0, nil
}

func setupDiscountIntegrationEnv(t *testing.T) (
	*database.DB,
	catalogService.CategoryService,
	catalogService.ProductService,
	cartService.CartService,
	orderService.OrderService,
	*handler.PublicCatalogHandler,
) {
	t.Helper()

	_ = godotenv.Load("../../../.env")
	_ = godotenv.Load("../../../backend/.env")
	cfg, err := config.LoadConfig()
	require.NoError(t, err)

	_, err = logger.InitLogger("test")
	require.NoError(t, err)

	db, err := database.Connect(cfg)
	require.NoError(t, err)
	t.Cleanup(func() {
		sqlDB, err := db.DB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	aSvc := &noopAuditService{}
	iRepo := invRepo.NewInventoryRepository(db.DB)
	catRepo := repository.NewCategoryRepository(db.DB)
	prodRepo := repository.NewProductRepository(db.DB)
	cRepo := cartRepo.NewCartRepository(db.DB)
	custRepo := customerRepo.NewCustomerRepository(db.DB)
	oRepo := orderRepo.NewOrderRepository(db.DB)
	lRepo := loyaltyRepo.NewLoyaltyRepository(db.DB)

	iSvc := invService.NewInventoryService(iRepo, aSvc, db.DB)
	catSvc := catalogService.NewCategoryService(catRepo, aSvc)
	prodSvc := catalogService.NewProductService(prodRepo, catRepo, iSvc, aSvc, nil, db.DB)
	cSvc := cartService.NewCartService(cRepo, prodRepo, iSvc)
	custSvc := customerService.NewCustomerService(custRepo, aSvc)
	waSvc := whatsappService.NewWhatsAppService(cfg.WhatsAppPhoneNumber, cfg.WhatsAppPrefix)
	lSvc := loyaltyService.NewLoyaltyService(lRepo, aSvc)
	oSvc := orderService.NewOrderService(oRepo, cRepo, custRepo, custSvc, iSvc, lSvc, waSvc, aSvc, db.DB)

	pubHandler := handler.NewPublicCatalogHandler(prodSvc, catSvc)
	return db, catSvc, prodSvc, cSvc, oSvc, pubHandler
}

func TestEndToEndAdminDiscountToCustomerCartCheckoutAndHistory(t *testing.T) {
	db, catSvc, prodSvc, cartSvc, orderSvc, pubHandler := setupDiscountIntegrationEnv(t)
	ctx := context.Background()

	suffix := uuid.NewString()[:8]
	actorID := uuid.NewString()
	sessionID := "test-session-" + suffix
	testPhone := "0799" + suffix[:6]

	var createdCategoryID int
	var createdProductIDs []string
	var createdOrderIDs []string
	var createdCartIDs []string

	t.Cleanup(func() {
		for _, oid := range createdOrderIDs {
			_ = db.DB.Exec("DELETE FROM order_status_history WHERE order_id = ?", oid)
			_ = db.DB.Exec("DELETE FROM order_items WHERE order_id = ?", oid)
			_ = db.DB.Exec("DELETE FROM orders WHERE id = ?", oid)
		}
		for _, cid := range createdCartIDs {
			_ = db.DB.Exec("DELETE FROM cart_items WHERE cart_id = ?", cid)
			_ = db.DB.Exec("DELETE FROM carts WHERE id = ?", cid)
		}
		_ = db.DB.Exec("DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE session_id = ?)", sessionID)
		_ = db.DB.Exec("DELETE FROM carts WHERE session_id = ?", sessionID)

		for _, pid := range createdProductIDs {
			_ = db.DB.Exec("DELETE FROM stock_movements WHERE product_id = ?", pid)
			_ = db.DB.Exec("DELETE FROM product_stock WHERE product_id = ?", pid)
			_ = db.DB.Exec("DELETE FROM product_images WHERE product_id = ?", pid)
			_ = db.DB.Exec("DELETE FROM products WHERE id = ?", pid)
		}
		if createdCategoryID > 0 {
			_ = db.DB.Exec("DELETE FROM categories WHERE id = ?", createdCategoryID)
		}
		_ = db.DB.Exec("DELETE FROM customers WHERE phone = ?", testPhone)
	})

	isActive := true
	cat, err := catSvc.Create(ctx, actorID, &dto.CategoryRequest{
		Name:     "Discount Test Cat " + suffix,
		IsActive: &isActive,
	}, "127.0.0.1", "go-test")
	require.NoError(t, err)
	createdCategoryID = cat.ID

	// 1. Admin creates product with Original SellingPrice = 1000 and 20% discount enabled
	discEnabled := true
	prodA, err := prodSvc.Create(ctx, actorID, &dto.CreateProductRequest{
		CategoryID:        cat.ID,
		SKU:               "DISC-A-" + suffix,
		Name:              "Test Discount Product A " + suffix,
		Description:       "End-to-end discount test item",
		UnitOfMeasure:     "UNIT",
		SellingPrice:      1000,
		CostPrice:         600,
		InitialStock:      50,
		LowStockThreshold: 5,
		MinOrderQuantity:  1,
		IsDiscountEnabled: &discEnabled,
		DiscountPercent:   20,
		IsActive:          &isActive,
	}, "127.0.0.1", "go-test")
	require.NoError(t, err)
	createdProductIDs = append(createdProductIDs, prodA.ID)

	require.True(t, prodA.IsDiscountEnabled)
	require.True(t, prodA.IsDiscountActive)
	require.Equal(t, "ACTIVE", prodA.DiscountStatus)
	require.Equal(t, float64(1000), prodA.SellingPrice)
	require.Equal(t, float64(20), prodA.DiscountPercent)
	require.Equal(t, float64(800), prodA.DiscountedPrice)
	require.Equal(t, float64(200), prodA.DiscountAmount)

	// 2. Customer Public API endpoints (GetPublicByID, ListPublic, & HTTP response headers/JSON)
	pubA, err := prodSvc.GetPublicByID(ctx, prodA.ID)
	require.NoError(t, err)
	require.True(t, pubA.IsDiscountEnabled)
	require.True(t, pubA.IsDiscountActive)
	require.Equal(t, "ACTIVE", pubA.DiscountStatus)
	require.Equal(t, float64(1000), pubA.SellingPrice)
	require.Equal(t, float64(20), pubA.DiscountPercent)
	require.Equal(t, float64(800), pubA.DiscountedPrice)
	require.Equal(t, float64(200), pubA.DiscountAmount)

	pubList, _, err := prodSvc.ListPublic(ctx, repository.ProductFilter{
		CategoryID: cat.ID,
		ActiveOnly: true,
		Limit:      20,
		Offset:     0,
	})
	require.NoError(t, err)
	require.Len(t, pubList, 1)
	require.True(t, pubList[0].IsDiscountActive)
	require.Equal(t, float64(800), pubList[0].DiscountedPrice)

	// Verify HTTP handler JSON + Cache-Control header
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/public/products/:id", pubHandler.GetProduct)
	reqHTTP := httptest.NewRequest(http.MethodGet, "/public/products/"+prodA.ID, nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, reqHTTP)
	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Header().Get("Cache-Control"), "no-store")
	var httpBody struct {
		Success bool                      `json:"success"`
		Data    dto.ProductPublicResponse `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &httpBody))
	require.True(t, httpBody.Success)
	require.True(t, httpBody.Data.IsDiscountActive)
	require.True(t, httpBody.Data.IsDiscountEnabled)
	require.Equal(t, "ACTIVE", httpBody.Data.DiscountStatus)
	require.Equal(t, float64(800), httpBody.Data.DiscountedPrice)

	// 3. Customer adds qty 3 to Cart -> verifies discounted unit price, original total, and savings
	cart, err := cartSvc.AddItem(ctx, sessionID, nil, &cartDto.AddToCartRequest{
		ProductID: prodA.ID,
		Quantity:  3,
	})
	require.NoError(t, err)
	createdCartIDs = append(createdCartIDs, cart.ID)
	require.Len(t, cart.Items, 1)
	require.Equal(t, float64(1000), cart.Items[0].OriginalPrice)
	require.Equal(t, float64(800), cart.Items[0].UnitPrice)
	require.Equal(t, float64(20), cart.Items[0].DiscountPercent)
	require.Equal(t, float64(200), cart.Items[0].DiscountAmount)
	require.Equal(t, float64(2400), cart.Items[0].Subtotal)
	require.Equal(t, float64(2400), cart.TotalAmount)
	require.Equal(t, float64(3000), cart.OriginalTotal)
	require.Equal(t, float64(600), cart.TotalSavings)

	// 4. Customer checks out -> verifies historical Order snapshot stores discounted pricing
	orderRes, err := orderSvc.Checkout(ctx, sessionID, nil, &orderDto.CheckoutRequest{
		CustomerName:    "Discount Test Buyer",
		CustomerPhone:   testPhone,
		CustomerEmail:   "buyer+" + suffix + "@example.com",
		DeliveryAddress: "123 Test Street, Colombo",
	}, "127.0.0.1", "go-test")
	require.NoError(t, err)
	createdOrderIDs = append(createdOrderIDs, orderRes.ID)
	require.Equal(t, float64(2400), orderRes.TotalAmount)
	require.Len(t, orderRes.Items, 1)
	require.Equal(t, float64(800), orderRes.Items[0].UnitPrice)
	require.NotNil(t, orderRes.Items[0].OriginalPrice)
	require.Equal(t, float64(1000), *orderRes.Items[0].OriginalPrice)
	require.Equal(t, float64(20), orderRes.Items[0].DiscountPercent)
	require.Equal(t, float64(200), orderRes.Items[0].DiscountAmount)
	require.Equal(t, float64(2400), orderRes.Items[0].Subtotal)

	// 5. Admin disables discount -> Customer catalog & cart immediately revert to original price
	//    while existing historical order retains original discounted snapshot
	discDisabled := false
	updatedDisabled, err := prodSvc.Update(ctx, actorID, prodA.ID, &dto.UpdateProductRequest{
		CategoryID:        cat.ID,
		Name:              prodA.Name,
		Description:       prodA.Description,
		UnitOfMeasure:     prodA.UnitOfMeasure,
		SellingPrice:      1000,
		CostPrice:         600,
		LowStockThreshold: 5,
		MinOrderQuantity:  1,
		IsDiscountEnabled: &discDisabled,
		DiscountPercent:   0,
		IsActive:          &isActive,
	}, "127.0.0.1", "go-test")
	require.NoError(t, err)
	require.False(t, updatedDisabled.IsDiscountEnabled)
	require.False(t, updatedDisabled.IsDiscountActive)
	require.Equal(t, "DISABLED", updatedDisabled.DiscountStatus)

	pubAfterDisable, err := prodSvc.GetPublicByID(ctx, prodA.ID)
	require.NoError(t, err)
	require.False(t, pubAfterDisable.IsDiscountActive)
	require.False(t, pubAfterDisable.IsDiscountEnabled)
	require.Equal(t, "DISABLED", pubAfterDisable.DiscountStatus)
	require.Equal(t, float64(1000), pubAfterDisable.DiscountedPrice)
	require.Equal(t, float64(0), pubAfterDisable.DiscountAmount)

	// Historical order MUST still retain discounted price 800 & total 2400
	histOrder, err := orderSvc.GetOrderByID(ctx, orderRes.ID)
	require.NoError(t, err)
	require.Equal(t, float64(2400), histOrder.TotalAmount)
	require.Equal(t, float64(800), histOrder.Items[0].UnitPrice)
	require.Equal(t, float64(20), histOrder.Items[0].DiscountPercent)

	// 6. Expired & Scheduled discount date windows do not apply on customer side
	pastStart := time.Now().Add(-48 * time.Hour)
	pastEnd := time.Now().Add(-1 * time.Hour)
	expiredProd, err := prodSvc.Update(ctx, actorID, prodA.ID, &dto.UpdateProductRequest{
		CategoryID:        cat.ID,
		Name:              prodA.Name,
		Description:       prodA.Description,
		UnitOfMeasure:     prodA.UnitOfMeasure,
		SellingPrice:      1000,
		CostPrice:         600,
		LowStockThreshold: 5,
		MinOrderQuantity:  1,
		IsDiscountEnabled: &discEnabled,
		DiscountPercent:   30,
		DiscountStartDate: &pastStart,
		DiscountEndDate:   &pastEnd,
		IsActive:          &isActive,
	}, "127.0.0.1", "go-test")
	require.NoError(t, err)
	require.Equal(t, "EXPIRED", expiredProd.DiscountStatus)
	require.False(t, expiredProd.IsDiscountActive)

	pubExpired, err := prodSvc.GetPublicByID(ctx, prodA.ID)
	require.NoError(t, err)
	require.False(t, pubExpired.IsDiscountActive)
	require.Equal(t, "EXPIRED", pubExpired.DiscountStatus)
	require.Equal(t, float64(1000), pubExpired.DiscountedPrice)

	futureStart := time.Now().Add(24 * time.Hour)
	futureEnd := time.Now().Add(72 * time.Hour)
	schedProd, err := prodSvc.Update(ctx, actorID, prodA.ID, &dto.UpdateProductRequest{
		CategoryID:        cat.ID,
		Name:              prodA.Name,
		Description:       prodA.Description,
		UnitOfMeasure:     prodA.UnitOfMeasure,
		SellingPrice:      1000,
		CostPrice:         600,
		LowStockThreshold: 5,
		MinOrderQuantity:  1,
		IsDiscountEnabled: &discEnabled,
		DiscountPercent:   25,
		DiscountStartDate: &futureStart,
		DiscountEndDate:   &futureEnd,
		IsActive:          &isActive,
	}, "127.0.0.1", "go-test")
	require.NoError(t, err)
	require.Equal(t, "SCHEDULED", schedProd.DiscountStatus)
	require.False(t, schedProd.IsDiscountActive)

	// 7. Dynamic price sync & Multiple products with different discount percentages in cart:
	//    Re-enable prodA with 10% on 500 (=450), add prodB with 25% on 400 (=300) qty 2, add prodC 0% on 200 (=200)
	prodB, err := prodSvc.Create(ctx, actorID, &dto.CreateProductRequest{
		CategoryID:        cat.ID,
		SKU:               "DISC-B-" + suffix,
		Name:              "Test Discount Product B " + suffix,
		UnitOfMeasure:     "UNIT",
		SellingPrice:      400,
		CostPrice:         200,
		InitialStock:      20,
		LowStockThreshold: 2,
		MinOrderQuantity:  1,
		IsDiscountEnabled: &discEnabled,
		DiscountPercent:   25,
		IsActive:          &isActive,
	}, "127.0.0.1", "go-test")
	require.NoError(t, err)
	createdProductIDs = append(createdProductIDs, prodB.ID)

	prodC, err := prodSvc.Create(ctx, actorID, &dto.CreateProductRequest{
		CategoryID:        cat.ID,
		SKU:               "DISC-C-" + suffix,
		Name:              "Test Regular Product C " + suffix,
		UnitOfMeasure:     "UNIT",
		SellingPrice:      200,
		CostPrice:         100,
		InitialStock:      20,
		LowStockThreshold: 2,
		MinOrderQuantity:  1,
		IsDiscountEnabled: &discDisabled,
		DiscountPercent:   0,
		IsActive:          &isActive,
	}, "127.0.0.1", "go-test")
	require.NoError(t, err)
	createdProductIDs = append(createdProductIDs, prodC.ID)

	// Set prodA to active 10% on 500
	_, err = prodSvc.Update(ctx, actorID, prodA.ID, &dto.UpdateProductRequest{
		CategoryID:        cat.ID,
		Name:              prodA.Name,
		Description:       prodA.Description,
		UnitOfMeasure:     prodA.UnitOfMeasure,
		SellingPrice:      500,
		CostPrice:         300,
		LowStockThreshold: 5,
		MinOrderQuantity:  1,
		IsDiscountEnabled: &discEnabled,
		DiscountPercent:   10,
		DiscountStartDate: nil,
		DiscountEndDate:   nil,
		IsActive:          &isActive,
	}, "127.0.0.1", "go-test")
	require.NoError(t, err)

	multiSession := "multi-" + sessionID
	t.Cleanup(func() {
		_ = db.DB.Exec("DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE session_id = ?)", multiSession)
		_ = db.DB.Exec("DELETE FROM carts WHERE session_id = ?", multiSession)
	})

	_, err = cartSvc.AddItem(ctx, multiSession, nil, &cartDto.AddToCartRequest{ProductID: prodA.ID, Quantity: 1})
	require.NoError(t, err)
	_, err = cartSvc.AddItem(ctx, multiSession, nil, &cartDto.AddToCartRequest{ProductID: prodB.ID, Quantity: 2})
	require.NoError(t, err)
	multiCart, err := cartSvc.AddItem(ctx, multiSession, nil, &cartDto.AddToCartRequest{ProductID: prodC.ID, Quantity: 1})
	require.NoError(t, err)

	// Expected: (450*1) + (300*2) + (200*1) = 1250; Original = 500 + 800 + 200 = 1500; Savings = 250
	require.Equal(t, float64(1250), multiCart.TotalAmount)
	require.Equal(t, float64(1500), multiCart.OriginalTotal)
	require.Equal(t, float64(250), multiCart.TotalSavings)

	// Dynamic cart update when Admin disables prodB discount while item is already in cart
	_, err = prodSvc.Update(ctx, actorID, prodB.ID, &dto.UpdateProductRequest{
		CategoryID:        cat.ID,
		Name:              prodB.Name,
		UnitOfMeasure:     prodB.UnitOfMeasure,
		SellingPrice:      400,
		CostPrice:         200,
		LowStockThreshold: 2,
		MinOrderQuantity:  1,
		IsDiscountEnabled: &discDisabled,
		DiscountPercent:   0,
		IsActive:          &isActive,
	}, "127.0.0.1", "go-test")
	require.NoError(t, err)

	refreshedCart, err := cartSvc.GetCart(ctx, multiSession, nil)
	require.NoError(t, err)
	// Expected now: prodA=450, prodB=400*2=800, prodC=200 => Total=1450, Original=1500, Savings=50
	require.Equal(t, float64(1450), refreshedCart.TotalAmount)
	require.Equal(t, float64(1500), refreshedCart.OriginalTotal)
	require.Equal(t, float64(50), refreshedCart.TotalSavings)

	// 8. Validation rejection checks
	_, err = prodSvc.Create(ctx, actorID, &dto.CreateProductRequest{
		CategoryID:        cat.ID,
		SKU:               fmt.Sprintf("INV-%s", suffix),
		Name:              "Invalid Discount Product",
		UnitOfMeasure:     "UNIT",
		SellingPrice:      100,
		IsDiscountEnabled: &discEnabled,
		DiscountPercent:   100, // invalid
	}, "127.0.0.1", "go-test")
	require.Error(t, err)

	_, err = prodSvc.Create(ctx, actorID, &dto.CreateProductRequest{
		CategoryID:        cat.ID,
		SKU:               fmt.Sprintf("INV2-%s", suffix),
		Name:              "Invalid Window Product",
		UnitOfMeasure:     "UNIT",
		SellingPrice:      100,
		IsDiscountEnabled: &discEnabled,
		DiscountPercent:   10,
		DiscountStartDate: &futureEnd,
		DiscountEndDate:   &futureStart, // end before start
	}, "127.0.0.1", "go-test")
	require.Error(t, err)
}
