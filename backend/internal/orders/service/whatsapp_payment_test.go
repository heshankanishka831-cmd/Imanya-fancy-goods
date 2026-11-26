package service

import (
	"context"
	"testing"

	auditRepo "distribution-management/internal/audit/repository"
	auditSvc "distribution-management/internal/audit/service"
	cartRepo "distribution-management/internal/carts/repository"
	custRepo "distribution-management/internal/customers/repository"
	custSvc "distribution-management/internal/customers/service"
	invRepo "distribution-management/internal/inventory/repository"
	invSvc "distribution-management/internal/inventory/service"
	"distribution-management/internal/orders/dto"
	orderRepo "distribution-management/internal/orders/repository"
	whatsappSvc "distribution-management/internal/whatsapp/service"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupPaymentWorkflowDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:wa_payment_test?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, first_name TEXT, last_name TEXT);
		CREATE TABLE IF NOT EXISTS customers (
			id TEXT PRIMARY KEY, user_id TEXT UNIQUE, first_name TEXT, last_name TEXT,
			name TEXT NOT NULL, email TEXT, phone TEXT NOT NULL, business_name TEXT,
			residential_address TEXT, delivery_address TEXT,
			membership_tier TEXT DEFAULT 'BRONZE', lifetime_spent REAL DEFAULT 0,
			profile_photo_url TEXT, is_active BOOLEAN DEFAULT TRUE,
			created_at DATETIME, updated_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT, is_active BOOLEAN DEFAULT TRUE);
		CREATE TABLE IF NOT EXISTS products (
			id TEXT PRIMARY KEY, category_id INTEGER, sku TEXT, name TEXT, slug TEXT,
			description TEXT, unit_of_measure TEXT, cost_price REAL, selling_price REAL,
			min_order_quantity INTEGER DEFAULT 1, is_discount_enabled BOOLEAN DEFAULT FALSE,
			discount_percent REAL DEFAULT 0, discount_start_date DATETIME, discount_end_date DATETIME,
			is_active BOOLEAN DEFAULT TRUE, created_at DATETIME, updated_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS product_images (
			id TEXT PRIMARY KEY, product_id TEXT, image_url TEXT, alt_text TEXT,
			is_primary BOOLEAN DEFAULT FALSE, sort_order INTEGER DEFAULT 0, created_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS product_stock (
			id TEXT PRIMARY KEY, product_id TEXT UNIQUE, current_stock INTEGER DEFAULT 0,
			allocated_stock INTEGER DEFAULT 0, low_stock_threshold INTEGER DEFAULT 5, updated_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS stock_movements (
			id TEXT PRIMARY KEY, product_id TEXT, user_id TEXT, movement_type TEXT, quantity_changed INTEGER,
			quantity_before INTEGER, quantity_after INTEGER, reference_id TEXT, notes TEXT,
			created_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS carts (id TEXT PRIMARY KEY, session_id TEXT, customer_id TEXT, created_at DATETIME, updated_at DATETIME);
		CREATE TABLE IF NOT EXISTS cart_items (id TEXT PRIMARY KEY, cart_id TEXT, product_id TEXT, quantity INTEGER, created_at DATETIME, updated_at DATETIME);
		CREATE TABLE IF NOT EXISTS orders (
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
		CREATE TABLE IF NOT EXISTS order_items (
			id TEXT PRIMARY KEY, order_id TEXT, product_id TEXT, product_sku TEXT, product_name TEXT,
			unit_price REAL, quantity INTEGER, subtotal REAL, original_price REAL,
			discount_percent REAL DEFAULT 0, discount_amount REAL DEFAULT 0
		);
		CREATE TABLE IF NOT EXISTS order_status_history (
			id TEXT PRIMARY KEY, order_id TEXT, previous_status TEXT, new_status TEXT,
			changed_by TEXT, notes TEXT, created_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS order_payment_history (
			id TEXT PRIMARY KEY, order_id TEXT, previous_status TEXT DEFAULT '', new_status TEXT,
			changed_by TEXT, source TEXT DEFAULT 'ADMIN', notes TEXT DEFAULT '', created_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS audit_logs (
			id TEXT PRIMARY KEY, user_id TEXT, action TEXT, entity_name TEXT, entity_id TEXT,
			old_values TEXT, new_values TEXT, ip_address TEXT, user_agent TEXT, created_at DATETIME
		);
		DELETE FROM order_payment_history;
		DELETE FROM order_status_history;
		DELETE FROM order_items;
		DELETE FROM orders;
		DELETE FROM cart_items;
		DELETE FROM carts;
		DELETE FROM product_stock;
		DELETE FROM products;
		DELETE FROM categories;
		DELETE FROM users;
		INSERT INTO users (id, first_name, last_name) VALUES ('admin-1', 'Super', 'Admin');
		INSERT INTO categories (id, name, is_active) VALUES (1, 'Gifts', 1);
		INSERT INTO products (id, category_id, sku, name, slug, unit_of_measure, cost_price, selling_price, min_order_quantity, is_active)
		VALUES ('p-1', 1, 'GIFT-01', 'Gift Box', 'gift-box', 'Unit', 200, 500, 1, 1);
		INSERT INTO product_stock (id, product_id, current_stock, allocated_stock, low_stock_threshold)
		VALUES ('s-1', 'p-1', 10, 0, 2);
	`).Error; err != nil {
		t.Fatalf("schema/seed failed: %v", err)
	}
	return db
}

func TestWhatsAppPaymentVerificationAndOrderProcessingGuard(t *testing.T) {
	db := setupPaymentWorkflowDB(t)
	ctx := context.Background()

	aRepo := auditRepo.NewAuditRepository(db)
	aSvc := auditSvc.NewAuditService(aRepo)
	cRepo := custRepo.NewCustomerRepository(db)
	cSvc := custSvc.NewCustomerService(cRepo, aSvc)
	iRepo := invRepo.NewInventoryRepository(db)
	iSvc := invSvc.NewInventoryService(iRepo, aSvc, db)
	oRepo := orderRepo.NewOrderRepository(db)
	caRepo := cartRepo.NewCartRepository(db)
	waSvc := whatsappSvc.NewWhatsAppService("94766611606", "Order:")
	svc := NewOrderService(oRepo, caRepo, cRepo, cSvc, iSvc, nil, waSvc, aSvc, db)

	// 1. Create Guest Order -> defaults to PAYMENT_PENDING & PENDING
	order1, err := svc.GuestCheckout(ctx, "sess-wa-1", &dto.GuestCheckoutRequest{
		FirstName:       "Amal",
		LastName:        "Perera",
		WhatsAppNumber:  "0771234567",
		DeliveryAddress: "12 Flower Rd",
		City:            "Colombo",
		Province:        "Western Province",
		Items:           []dto.GuestCheckoutItemInput{{ProductID: "p-1", Quantity: 2}},
	}, "127.0.0.1", "test")
	if err != nil {
		t.Fatalf("GuestCheckout failed: %v", err)
	}
	if order1.PaymentStatus != "PAYMENT_PENDING" || order1.Status != "PENDING" {
		t.Fatalf("expected PAYMENT_PENDING & PENDING, got %s & %s", order1.PaymentStatus, order1.Status)
	}

	// 2. Confirming or Processing MUST fail until payment is verified
	if _, err := svc.UpdateStatus(ctx, "admin-1", order1.ID, "CONFIRMED", "Attempt early confirm", "127.0.0.1", "test"); err == nil {
		t.Fatal("expected CONFIRMED transition to be blocked before payment verification")
	}

	// 3. Incoming WhatsApp webhook associates receipt message with order
	matched, num, err := svc.RecordWhatsAppReceiptWebhook(ctx, "94771234567", "Here is my bank slip for "+order1.OrderNumber)
	if err != nil || !matched || num != order1.OrderNumber {
		t.Fatalf("expected webhook to match %s, got matched=%v num=%s err=%v", order1.OrderNumber, matched, num, err)
	}

	// 4. Rejecting payment without a reason must fail
	if _, err := svc.UpdatePaymentStatus(ctx, "admin-1", order1.ID, "PAYMENT_REJECTED", "", "ADMIN", "127.0.0.1", "test"); err == nil {
		t.Fatal("expected PAYMENT_REJECTED without notes to fail")
	}

	// 5. Reject with reason -> still cannot confirm order
	rej, err := svc.UpdatePaymentStatus(ctx, "admin-1", order1.ID, "PAYMENT_REJECTED", "Blurry slip", "ADMIN", "127.0.0.1", "test")
	if err != nil || rej.PaymentStatus != "PAYMENT_REJECTED" {
		t.Fatalf("expected PAYMENT_REJECTED, got err=%v status=%s", err, rej.PaymentStatus)
	}
	if _, err := svc.UpdateStatus(ctx, "admin-1", order1.ID, "CONFIRMED", "Try after reject", "127.0.0.1", "test"); err == nil {
		t.Fatal("expected CONFIRMED to remain blocked when payment is rejected")
	}

	// 6. Verify payment -> now CONFIRMED -> COMPLETED succeeds & deducts stock
	ver, err := svc.UpdatePaymentStatus(ctx, "admin-1", order1.ID, "PAYMENT_VERIFIED", "Bank ref #9988 verified", "ADMIN", "127.0.0.1", "test")
	if err != nil || ver.PaymentStatus != "PAYMENT_VERIFIED" || ver.PaymentVerifiedAt == nil {
		t.Fatalf("expected PAYMENT_VERIFIED with timestamp, got err=%v status=%s", err, ver.PaymentStatus)
	}
	if len(ver.PaymentHistory) < 4 {
		t.Fatalf("expected full payment verification history, got %d entries", len(ver.PaymentHistory))
	}

	if _, err := svc.UpdateStatus(ctx, "admin-1", order1.ID, "CONFIRMED", "Payment verified", "127.0.0.1", "test"); err != nil {
		t.Fatalf("expected CONFIRMED after payment verification to succeed: %v", err)
	}
	if _, err := svc.UpdateStatus(ctx, "admin-1", order1.ID, "COMPLETED", "Dispatched", "127.0.0.1", "test"); err != nil {
		t.Fatalf("expected COMPLETED after payment verification to succeed: %v", err)
	}

	// 7. Second order cancelled while PAYMENT_PENDING -> restores allocated stock cleanly
	order2, err := svc.GuestCheckout(ctx, "sess-wa-2", &dto.GuestCheckoutRequest{
		FirstName:       "Sita",
		LastName:        "Fernando",
		WhatsAppNumber:  "0779998888",
		DeliveryAddress: "45 Lake Rd",
		City:            "Kandy",
		Province:        "Central Province",
		Items:           []dto.GuestCheckoutItemInput{{ProductID: "p-1", Quantity: 3}},
	}, "127.0.0.1", "test")
	if err != nil {
		t.Fatalf("second GuestCheckout failed: %v", err)
	}
	if _, err := svc.UpdateStatus(ctx, "admin-1", order2.ID, "CANCELLED", "Customer cancelled", "127.0.0.1", "test"); err != nil {
		t.Fatalf("expected CANCELLED while PAYMENT_PENDING to succeed: %v", err)
	}

	var currentStock, allocatedStock int
	db.Table("product_stock").Select("current_stock, allocated_stock").Where("product_id = 'p-1'").Row().Scan(&currentStock, &allocatedStock)
	if currentStock != 8 || allocatedStock != 0 {
		t.Fatalf("expected current_stock=8 and allocated_stock=0, got current=%d allocated=%d", currentStock, allocatedStock)
	}
}
