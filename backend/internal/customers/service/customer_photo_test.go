package service

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"distribution-management/internal/audit/model"
	auditRepo "distribution-management/internal/audit/repository"
	auditSvc "distribution-management/internal/audit/service"
	custModel "distribution-management/internal/customers/model"
	custRepo "distribution-management/internal/customers/repository"
	"distribution-management/internal/platform/storage"
	userModel "distribution-management/internal/users/model"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupPhotoTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:photo_test?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}
	if err := db.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			role_id INTEGER,
			username TEXT UNIQUE,
			email TEXT UNIQUE,
			password_hash TEXT,
			first_name TEXT,
			last_name TEXT,
			is_active BOOLEAN DEFAULT TRUE,
			email_verified BOOLEAN DEFAULT TRUE,
			email_verified_at DATETIME,
			created_at DATETIME,
			updated_at DATETIME
		);
		CREATE TABLE customers (
			id TEXT PRIMARY KEY,
			user_id TEXT UNIQUE,
			first_name TEXT,
			last_name TEXT,
			name TEXT NOT NULL,
			email TEXT,
			phone TEXT NOT NULL,
			business_name TEXT,
			residential_address TEXT,
			delivery_address TEXT,
			res_house_no TEXT,
			res_street TEXT,
			res_city TEXT,
			res_district TEXT,
			res_postal_code TEXT,
			delivery_same_as_residential BOOLEAN DEFAULT TRUE,
			del_recipient_name TEXT,
			del_phone TEXT,
			del_house_no TEXT,
			del_street TEXT,
			del_city TEXT,
			del_district TEXT,
			del_postal_code TEXT,
			membership_tier TEXT DEFAULT 'BRONZE',
			lifetime_spent REAL DEFAULT 0,
			profile_photo_url TEXT,
			is_active BOOLEAN DEFAULT TRUE,
			created_at DATETIME,
			updated_at DATETIME
		);
		CREATE TABLE orders (
			id TEXT PRIMARY KEY,
			customer_id TEXT,
			status TEXT,
			total_amount REAL
		);
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			user_id TEXT,
			action TEXT,
			entity_type TEXT,
			entity_id TEXT,
			old_values TEXT,
			new_values TEXT,
			ip_address TEXT,
			user_agent TEXT,
			created_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}
	_ = model.AuditLog{}
	return db
}

func makeTestPNGHeader(t *testing.T, filename string) *multipart.FileHeader {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 8, 8))
	img.Set(1, 1, color.RGBA{R: 10, G: 20, B: 30, A: 255})
	var pngBuf bytes.Buffer
	if err := png.Encode(&pngBuf, img); err != nil {
		t.Fatalf("png.Encode failed: %v", err)
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="photo"; filename="`+filename+`"`)
	h.Set("Content-Type", "image/png")
	part, err := writer.CreatePart(h)
	if err != nil {
		t.Fatalf("CreatePart failed: %v", err)
	}
	_, _ = part.Write(pngBuf.Bytes())
	_ = writer.Close()

	reader := multipart.NewReader(&body, writer.Boundary())
	form, err := reader.ReadForm(1024 * 1024)
	if err != nil {
		t.Fatalf("ReadForm failed: %v", err)
	}
	return form.File["photo"][0]
}

func TestCustomerProfilePhotoLifecycle(t *testing.T) {
	db := setupPhotoTestDB(t)
	tmpDir := t.TempDir()
	diskStorage, err := storage.NewDiskStorage(tmpDir, 5)
	if err != nil {
		t.Fatalf("NewDiskStorage failed: %v", err)
	}

	userID := "user-1"
	custID := "cust-1"
	if err := db.Create(&userModel.User{
		ID:        userID,
		RoleID:    4,
		Username:  "kasun@example.com",
		Email:     "kasun@example.com",
		FirstName: "Kasun",
		LastName:  "Perera",
		IsActive:  true,
	}).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	if err := db.Create(&custModel.Customer{
		ID:        custID,
		UserID:    &userID,
		FirstName: "Kasun",
		LastName:  "Perera",
		Name:      "Kasun Perera",
		Email:     "kasun@example.com",
		Phone:     "0771234567",
		IsActive:  true,
	}).Error; err != nil {
		t.Fatalf("create customer: %v", err)
	}

	cRepo := custRepo.NewCustomerRepository(db)
	aRepo := auditRepo.NewAuditRepository(db)
	aSvc := auditSvc.NewAuditService(aRepo)
	svc := NewCustomerService(cRepo, aSvc)
	svc.ConfigureStorage(diskStorage)

	ctx := context.Background()

	// 1. Missing auth rejected
	if _, err := svc.UploadProfilePhoto(ctx, "", makeTestPNGHeader(t, "a.png"), "127.0.0.1", "test"); err == nil {
		t.Fatal("expected empty userID to be rejected")
	}

	// 2. Upload initial photo
	res1, err := svc.UploadProfilePhoto(ctx, userID, makeTestPNGHeader(t, "first.png"), "127.0.0.1", "test")
	if err != nil {
		t.Fatalf("UploadProfilePhoto failed: %v", err)
	}
	if res1.ProfilePhotoURL == "" {
		t.Fatal("expected ProfilePhotoURL to be populated")
	}
	firstFile := filepath.Join(tmpDir, strings.TrimPrefix(res1.ProfilePhotoURL, "/uploads/"))
	if _, err := os.Stat(firstFile); err != nil {
		t.Fatalf("expected first uploaded file on disk: %v", err)
	}

	// 3. Replace photo -> new file saved, old file cleaned up
	res2, err := svc.UploadProfilePhoto(ctx, userID, makeTestPNGHeader(t, "second.png"), "127.0.0.1", "test")
	if err != nil {
		t.Fatalf("replacement UploadProfilePhoto failed: %v", err)
	}
	if res2.ProfilePhotoURL == "" || res2.ProfilePhotoURL == res1.ProfilePhotoURL {
		t.Fatal("expected a new unique ProfilePhotoURL on replacement")
	}
	if _, err := os.Stat(firstFile); !errors.Is(err, os.ErrNotExist) {
		t.Fatal("expected old profile photo to be deleted after successful replacement")
	}
	secondFile := filepath.Join(tmpDir, strings.TrimPrefix(res2.ProfilePhotoURL, "/uploads/"))
	if _, err := os.Stat(secondFile); err != nil {
		t.Fatalf("expected second uploaded file on disk: %v", err)
	}

	// 4. Remove photo -> DB cleared and disk file deleted
	res3, err := svc.RemoveProfilePhoto(ctx, userID, "127.0.0.1", "test")
	if err != nil {
		t.Fatalf("RemoveProfilePhoto failed: %v", err)
	}
	if res3.ProfilePhotoURL != "" {
		t.Fatalf("expected ProfilePhotoURL to be empty after removal, got %s", res3.ProfilePhotoURL)
	}
	if _, err := os.Stat(secondFile); !errors.Is(err, os.ErrNotExist) {
		t.Fatal("expected removed profile photo to be deleted from disk")
	}
}
