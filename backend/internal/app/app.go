package app

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"distribution-management/internal/config"
	"distribution-management/internal/platform/database"
	"distribution-management/internal/platform/email"
	"distribution-management/internal/platform/logger"
	"distribution-management/internal/platform/middleware"
	"distribution-management/internal/platform/storage"

	// Module layers
	auditRepo "distribution-management/internal/audit/repository"
	auditService "distribution-management/internal/audit/service"
	auditHandler "distribution-management/internal/audit/handler"

	userRepo "distribution-management/internal/users/repository"
	userService "distribution-management/internal/users/service"
	userHandler "distribution-management/internal/users/handler"

	authService "distribution-management/internal/auth/service"
	authHandler "distribution-management/internal/auth/handler"

	invRepo "distribution-management/internal/inventory/repository"
	invService "distribution-management/internal/inventory/service"
	invHandler "distribution-management/internal/inventory/handler"

	catalogRepo "distribution-management/internal/catalog/repository"
	catalogService "distribution-management/internal/catalog/service"
	catalogHandler "distribution-management/internal/catalog/handler"

	supplierRepo "distribution-management/internal/suppliers/repository"
	supplierService "distribution-management/internal/suppliers/service"
	supplierHandler "distribution-management/internal/suppliers/handler"

	procurementRepo "distribution-management/internal/procurement/repository"
	procurementService "distribution-management/internal/procurement/service"
	procurementHandler "distribution-management/internal/procurement/handler"

	customerRepo "distribution-management/internal/customers/repository"
	customerService "distribution-management/internal/customers/service"
	customerHandler "distribution-management/internal/customers/handler"

	cartRepo "distribution-management/internal/carts/repository"
	cartService "distribution-management/internal/carts/service"
	cartHandler "distribution-management/internal/carts/handler"

	whatsappService "distribution-management/internal/whatsapp/service"

	orderRepo "distribution-management/internal/orders/repository"
	orderService "distribution-management/internal/orders/service"
	orderHandler "distribution-management/internal/orders/handler"

	reportService "distribution-management/internal/reports/service"
	reportHandler "distribution-management/internal/reports/handler"

	loyaltyRepo "distribution-management/internal/loyalty/repository"
	loyaltyService "distribution-management/internal/loyalty/service"
	loyaltyHandler "distribution-management/internal/loyalty/handler"

	otpRepoPkg "distribution-management/internal/otp/repository"
	otpSvc "distribution-management/internal/otp/service"
)

type Application struct {
	Config *config.Config
	DB     *database.DB
	Server *http.Server
}

func Bootstrap() (*Application, error) {
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load configuration: %w", err)
	}

	_, err = logger.InitLogger(cfg.ServerEnv)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize logger: %w", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Apply migrations
	if err := db.RunMigrations("./migrations"); err != nil {
		logger.Log.Warnf("Migration warning: %v", err)
	}

	// Storage
	diskStorage, err := storage.NewDiskStorage(cfg.UploadDir, cfg.MaxUploadSizeMB)
	if err != nil {
		return nil, fmt.Errorf("failed to setup file storage: %w", err)
	}

	// RBAC Casbin
	casbinSvc, err := middleware.InitCasbin(db.DB)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize casbin enforcer: %w", err)
	}

	// Email / SMTP Validation & Safe Diagnostic Logging (never log SMTP_PASSWORD or full secrets)
	emailSender := email.NewSMTPMailer(cfg)
	smtpErr := emailSender.ValidateConfig()
	logger.Log.Infof(
		"Startup env diagnostics: env_files_loaded=%v smtp_host=%s smtp_port=%d smtp_email_loaded=%t smtp_sender=%s smtp_password_configured=%t smtp_valid=%t",
		cfg.LoadedEnvFiles,
		cfg.SMTPHost,
		cfg.SMTPPort,
		cfg.SMTPEmail != "",
		cfg.MaskedSMTPEmail(),
		cfg.SMTPPassword != "",
		smtpErr == nil,
	)
	if smtpErr != nil {
		logger.Log.Warnf("SMTP configuration incomplete (%v). Configure SMTP_HOST, SMTP_PORT, SMTP_EMAIL, and SMTP_PASSWORD in backend/.env for Email OTP delivery.", smtpErr)
	} else {
		logger.Log.Infof("SMTP email verification configured (%s:%d as %s)", cfg.SMTPHost, cfg.SMTPPort, cfg.MaskedSMTPEmail())
	}

	// Repositories
	aRepo := auditRepo.NewAuditRepository(db.DB)
	uRepo := userRepo.NewUserRepository(db.DB)
	iRepo := invRepo.NewInventoryRepository(db.DB)
	catRepo := catalogRepo.NewCategoryRepository(db.DB)
	prodRepo := catalogRepo.NewProductRepository(db.DB)
	sRepo := supplierRepo.NewSupplierRepository(db.DB)
	procRepo := procurementRepo.NewProcurementRepository(db.DB)
	custRepo := customerRepo.NewCustomerRepository(db.DB)
	cRepo := cartRepo.NewCartRepository(db.DB)
	oRepo := orderRepo.NewOrderRepository(db.DB)
	lRepo := loyaltyRepo.NewLoyaltyRepository(db.DB)
	oOTPRepo := otpRepoPkg.NewOTPRepository(db.DB)

	// Services
	aService := auditService.NewAuditService(aRepo)
	uService := userService.NewUserService(uRepo, aService)
	otpService := otpSvc.NewOTPService(oOTPRepo, emailSender, cfg.SMTPFromName)
	authSvc := authService.NewAuthService(uRepo, custRepo, otpService, aService, cfg.JWTSecret, cfg.JWTExpirationHours, db.DB)
	iService := invService.NewInventoryService(iRepo, aService, db.DB)
	catService := catalogService.NewCategoryService(catRepo, aService)
	prodService := catalogService.NewProductService(prodRepo, catRepo, iService, aService, diskStorage, db.DB)
	sService := supplierService.NewSupplierService(sRepo, aService)
	procService := procurementService.NewProcurementService(procRepo, sRepo, iService, aService, db.DB)
	custService := customerService.NewCustomerService(custRepo, aService)
	custService.ConfigureEmailVerification(otpService, oOTPRepo, db.DB)
	custService.ConfigureStorage(diskStorage)
	cService := cartService.NewCartService(cRepo, prodRepo, iService)
	waService := whatsappService.NewWhatsAppService(cfg.WhatsAppPhoneNumber, cfg.WhatsAppPrefix)
	waService.ConfigureCloudAPI(cfg.WhatsAppCloudAPIToken, cfg.WhatsAppPhoneNumberID, cfg.WhatsAppAPIVersion)
	lService := loyaltyService.NewLoyaltyService(lRepo, aService)
	oService := orderService.NewOrderService(oRepo, cRepo, custRepo, custService, iService, lService, waService, aService, db.DB)
	repService := reportService.NewReportService(db.DB)

	// Handlers
	aHandler := auditHandler.NewAuditHandler(aService)
	uHandler := userHandler.NewUserHandler(uService)
	authHdlr := authHandler.NewAuthHandler(authSvc)
	iHandler := invHandler.NewInventoryHandler(iService)
	catHdlr := catalogHandler.NewCategoryHandler(catService)
	prodHdlr := catalogHandler.NewProductHandler(prodService)
	pubCatHdlr := catalogHandler.NewPublicCatalogHandler(prodService, catService)
	sHandler := supplierHandler.NewSupplierHandler(sService)
	procHdlr := procurementHandler.NewProcurementHandler(procService)
	custHdlr := customerHandler.NewCustomerHandler(custService)
	cartHdlr := cartHandler.NewCartHandler(cService)
	oHandler := orderHandler.NewOrderHandler(oService, custService)
	repHdlr := reportHandler.NewReportHandler(repService)
	loyaltyHdlr := loyaltyHandler.NewLoyaltyHandler(lService, custRepo)

	router := SetupRouter(
		cfg,
		casbinSvc,
		authHdlr,
		uHandler,
		catHdlr,
		prodHdlr,
		pubCatHdlr,
		iHandler,
		sHandler,
		procHdlr,
		custHdlr,
		cartHdlr,
		oHandler,
		repHdlr,
		aHandler,
		loyaltyHdlr,
	)

	server := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return &Application{
		Config: cfg,
		DB:     db,
		Server: server,
	}, nil
}

func (app *Application) Run() error {
	go func() {
		logger.Log.Infof("Starting Distribution API server on port %s", app.Config.ServerPort)
		if err := app.Server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Log.Fatalf("HTTP server failed to start: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Log.Info("Shutting down API server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := app.Server.Shutdown(ctx); err != nil {
		return fmt.Errorf("server forced to shutdown: %w", err)
	}

	logger.Log.Info("Server stopped successfully")
	return nil
}
