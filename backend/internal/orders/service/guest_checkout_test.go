package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	auditRepo "distribution-management/internal/audit/repository"
	auditSvc "distribution-management/internal/audit/service"
	cartRepo "distribution-management/internal/carts/repository"
	custRepo "distribution-management/internal/customers/repository"
	custSvc "distribution-management/internal/customers/service"
	invRepo "distribution-management/internal/inventory/repository"
	invSvc "distribution-management/internal/inventory/service"
	"distribution-management/internal/orders/dto"
	"distribution-management/internal/orders/model"
	orderRepo "distribution-management/internal/orders/repository"
	whatsappSvc "distribution-management/internal/whatsapp/service"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupGuestCheckoutTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:guest_checkout_test?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}

	if err := db.Exec(`
		CREATE TABLE users (id TEXT PRIMARY KEY, first_name TEXT, last_name TEXT);
		CREATE TABLE customers (
			id TEXT PRIMARY KEY, user_id TEXT UNIQUE, first_name TEXT, last_name TEXT,
			name TEXT NOT NULL, email TEXT, phone TEXT NOT NULL, business_name TEXT,
			residential_address TEXT, delivery_address TEXT,
			membership_tier TEXT DEFAULT 'BRONZE', lifetime_spent REAL DEFAULT 0,
			profile_photo_url TEXT, is_active BOOLEAN DEFAULT TRUE,
			created_at DATETIME, updated_at DATETIME
		);
		CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT, is_active BOOLEAN DEFAULT TRUE);
		CREATE TABLE products (
			id TEXT PRIMARY KEY, category_id INTEGER, sku TEXT, name TEXT, slug TEXT,
			description TEXT, unit_of_measure TEXT, cost_price REAL, selling_price REAL,
			min_order_quantity INTEGER DEFAULT 1, is_discount_enabled BOOLEAN DEFAULT FALSE,
			discount_percent REAL DEFAULT 0, discount_start_date DATETIME, discount_end_date DATETIME,
			is_active BOOLEAN DEFAULT TRUE, created_at DATETIME, updated_at DATETIME
		);
		CREATE TABLE product_images (
			id TEXT PRIMARY KEY, product_id TEXT, image_url TEXT, alt_text TEXT,
			is_primary BOOLEAN DEFAULT FALSE, sort_order INTEGER DEFAULT 0, created_at DATETIME
		);
		CREATE TABLE product_stock (
			id TEXT PRIMARY KEY, product_id TEXT UNIQUE, current_stock INTEGER DEFAULT 0,
			allocated_stock INTEGER DEFAULT 0, low_stock_threshold INTEGER DEFAULT 5, updated_at DATETIME
		);
		CREATE TABLE stock_movements (
			id TEXT PRIMARY KEY, product_id TEXT, user_id TEXT, movement_type TEXT, quantity_changed INTEGER,
			quantity_before INTEGER, quantity_after INTEGER, reference_id TEXT, notes TEXT,
			created_at DATETIME
		);
		CREATE TABLE carts (id TEXT PRIMARY KEY, session_id TEXT, customer_id TEXT, created_at DATETIME, updated_at DATETIME);
		CREATE TABLE cart_items (id TEXT PRIMARY KEY, cart_id TEXT, product_id TEXT, quantity INTEGER, created_at DATETIME, updated_at DATETIME);
		CREATE TABLE orders (
			id TEXT PRIMARY KEY, order_number TEXT UNIQUE, customer_id TEXT,
			is_guest BOOLEAN DEFAULT FALSE, guest_first_name TEXT DEFAULT '', guest_last_name TEXT DEFAULT '',
			guest_name TEXT DEFAULT '', guest_phone TEXT DEFAULT '', guest_email TEXT DEFAULT '',
			guest_city TEXT DEFAULT '', guest_province TEXT DEFAULT '', guest_postal_code TEXT DEFAULT '',
			guest_access_token TEXT DEFAULT '', idempotency_key TEXT DEFAULT '',
			whatsapp_notification_status TEXT DEFAULT 'PENDING', whatsapp_notification_error TEXT DEFAULT '',
			payment_status TEXT DEFAULT 'PAYMENT_PENDING', payment_method TEXT DEFAULT 'BANK_TRANSFER_WHATSAPP',
			payment_notes TEXT DEFAULT '', payment_verified_by TEXT, payment_verified_at DATETIME,
			status TEXT DEFAULT 'PENDING', total_amount REAL, delivery_address TEXT,
			customer_notes TEXT, internal_notes TEXT, created_at DATETIME, updated_at DATETIME
		);
		CREATE TABLE order_items (
			id TEXT PRIMARY KEY, order_id TEXT, product_id TEXT, product_sku TEXT, product_name TEXT,
			unit_price REAL, quantity INTEGER, subtotal REAL, original_price REAL,
			discount_percent REAL DEFAULT 0, discount_amount REAL DEFAULT 0
		);
		CREATE TABLE order_status_history (
			id TEXT PRIMARY KEY, order_id TEXT, previous_status TEXT, new_status TEXT,
			changed_by TEXT, notes TEXT, created_at DATETIME
		);
		CREATE TABLE order_payment_history (
			id TEXT PRIMARY KEY, order_id TEXT, previous_status TEXT DEFAULT '', new_status TEXT,
			changed_by TEXT, source TEXT DEFAULT 'ADMIN', notes TEXT DEFAULT '', created_at DATETIME
		);
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY, user_id TEXT, action TEXT, entity_name TEXT, entity_id TEXT,
			old_values TEXT, new_values TEXT, ip_address TEXT, user_agent TEXT, created_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}
	return db
}

func TestGuestCheckoutFlowAndSecurity(t *testing.T) {
	db := setupGuestCheckoutTestDB(t)
	ctx := context.Background()

	// Seed product with 20% active discount and min_order_quantity = 2
	now := time.Now()
	start := now.Add(-1 * time.Hour)
	end := now.Add(24 * time.Hour)
	if err := db.Exec(`
		INSERT INTO categories (id, name, is_active) VALUES (1, 'Accessories', 1);
		INSERT INTO products (id, category_id, sku, name, slug, unit_of_measure, cost_price, selling_price, min_order_quantity, is_discount_enabled, discount_percent, discount_start_date, discount_end_date, is_active)
		VALUES ('prod-1', 1, 'SKU-101', 'Fancy Hair Clip', 'fancy-hair-clip', 'Pack', 50, 100.00, 2, 1, 20.00, ?, ?, 1);
		INSERT INTO product_stock (id, product_id, current_stock, allocated_stock, low_stock_threshold)
		VALUES ('stk-1', 'prod-1', 10, 0, 2);
		INSERT INTO carts (id, session_id) VALUES ('cart-1', 'guest-sess-1');
		INSERT INTO cart_items (id, cart_id, product_id, quantity) VALUES ('ci-1', 'cart-1', 'prod-1', 3);
	`, start, end).Error; err != nil {
		t.Fatalf("seed failed: %v", err)
	}

	// Simulate failing WhatsApp Cloud API server to ensure order is NOT lost on WhatsApp failure
	failingWA := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"upstream timeout"}`))
	}))
	defer failingWA.Close()

	aRepo := auditRepo.NewAuditRepository(db)
	aSvc := auditSvc.NewAuditService(aRepo)
	cRepo := custRepo.NewCustomerRepository(db)
	cSvc := custSvc.NewCustomerService(cRepo, aSvc)
	iRepo := invRepo.NewInventoryRepository(db)
	iSvc := invSvc.NewInventoryService(iRepo, aSvc, db)
	oRepo := orderRepo.NewOrderRepository(db)
	caRepo := cartRepo.NewCartRepository(db)
	waSvc := whatsappSvc.NewWhatsAppService("94766611606", "Order:")
	waSvc.ConfigureCloudAPI("fake-token", "12345", "v19.0")

	svc := NewOrderService(oRepo, caRepo, cRepo, cSvc, iSvc, nil, waSvc, aSvc, db)

	// 1. Successful guest checkout
	req := &dto.GuestCheckoutRequest{
		FirstName:            "Nimali",
		LastName:             "Silva",
		WhatsAppNumber:       "0771234567",
		Email:                "nimali@example.com",
		DeliveryAddress:      "45 Galle Road",
		City:                 "Colombo",
		Province:             "Western Province",
		PostalCode:           "00300",
		DeliveryInstructions: "Call on arrival",
		IdempotencyKey:       "idem-guest-001",
	}

	orderResp, err := svc.GuestCheckout(ctx, "guest-sess-1", req, "127.0.0.1", "test-agent")
	if err != nil {
		t.Fatalf("GuestCheckout failed: %v", err)
	}

	// Verify server-side discount calculation: 3 * (100 * 0.80) = 240.00
	if orderResp.TotalAmount != 240.00 {
		t.Fatalf("expected server-computed total 240.00, got %.2f", orderResp.TotalAmount)
	}
	if !orderResp.IsGuest {
		t.Fatal("expected IsGuest=true")
	}
	if orderResp.CustomerID != nil {
		t.Fatal("expected CustomerID=nil (no fake customer created)")
	}
	if orderResp.GuestAccessToken == "" {
		t.Fatal("expected GuestAccessToken to be generated")
	}

	// Verify NO fake customer record was created
	var customerCount int64
	db.Table("customers").Count(&customerCount)
	if customerCount != 0 {
		t.Fatalf("expected 0 customer records created for guest order, got %d", customerCount)
	}

	// 2. Duplicate submission with same IdempotencyKey returns existing order without duplicating
	dupResp, err := svc.GuestCheckout(ctx, "guest-sess-1", req, "127.0.0.1", "test-agent")
	if err != nil {
		t.Fatalf("idempotent GuestCheckout failed: %v", err)
	}
	if dupResp.OrderNumber != orderResp.OrderNumber {
		t.Fatalf("expected same order number %s on duplicate submission, got %s", orderResp.OrderNumber, dupResp.OrderNumber)
	}

	var orderCount int64
	db.Model(&model.Order{}).Count(&orderCount)
	if orderCount != 1 {
		t.Fatalf("expected exactly 1 order in DB after duplicate submission, got %d", orderCount)
	}

	// 3. Unauthorized lookup without token/phone must fail
	if _, err := svc.GetGuestOrder(ctx, orderResp.OrderNumber, "", ""); err == nil {
		t.Fatal("expected unauthorized guest order lookup to fail")
	}
	if _, err := svc.GetGuestOrder(ctx, orderResp.OrderNumber, "", "0719999999"); err == nil {
		t.Fatal("expected mismatched phone guest order lookup to fail")
	}

	// 4. Authorized lookup with token or matching phone succeeds
	byToken, err := svc.GetGuestOrder(ctx, orderResp.OrderNumber, orderResp.GuestAccessToken, "")
	if err != nil || byToken.OrderNumber != orderResp.OrderNumber {
		t.Fatalf("expected token lookup to succeed, got err=%v", err)
	}
	byPhone, err := svc.GetGuestOrder(ctx, orderResp.OrderNumber, "", "+94 77 123 4567")
	if err != nil || byPhone.OrderNumber != orderResp.OrderNumber {
		t.Fatalf("expected normalized phone lookup to succeed, got err=%v", err)
	}

	// 5. Invalid product ID rejected
	_, err = svc.GuestCheckout(ctx, "empty-sess", &dto.GuestCheckoutRequest{
		FirstName:       "Test",
		LastName:        "Guest",
		WhatsAppNumber:  "0771234567",
		DeliveryAddress: "123 Main St",
		City:            "Kandy",
		Province:        "Central Province",
		Items:           []dto.GuestCheckoutItemInput{{ProductID: "non-existent", Quantity: 2}},
	}, "127.0.0.1", "test")
	if err == nil {
		t.Fatal("expected invalid product ID to be rejected")
	}

	// 6. Stock validation & MOQ enforcement
	_, err = svc.GuestCheckout(ctx, "empty-sess", &dto.GuestCheckoutRequest{
		FirstName:       "Test",
		LastName:        "Guest",
		WhatsAppNumber:  "0771234567",
		DeliveryAddress: "123 Main St",
		City:            "Kandy",
		Province:        "Central Province",
		Items:           []dto.GuestCheckoutItemInput{{ProductID: "prod-1", Quantity: 1}}, // MOQ is 2
	}, "127.0.0.1", "test")
	if err == nil {
		t.Fatal("expected MOQ violation to be rejected")
	}

	_, err = svc.GuestCheckout(ctx, "empty-sess", &dto.GuestCheckoutRequest{
		FirstName:       "Test",
		LastName:        "Guest",
		WhatsAppNumber:  "0771234567",
		DeliveryAddress: "123 Main St",
		City:            "Kandy",
		Province:        "Central Province",
		Items:           []dto.GuestCheckoutItemInput{{ProductID: "prod-1", Quantity: 50}}, // Only 7 left
	}, "127.0.0.1", "test")
	if err == nil {
		t.Fatal("expected insufficient stock to be rejected")
	}
}
