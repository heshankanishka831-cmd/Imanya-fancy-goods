package app

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"wholesale-management/internal/config"
	"wholesale-management/internal/platform/database"
	"wholesale-management/internal/platform/logger"
	"wholesale-management/internal/platform/middleware"
	"wholesale-management/internal/platform/storage"

	// Module layers
	auditRepo "wholesale-management/internal/audit/repository"
	auditService "wholesale-management/internal/audit/service"
	auditHandler "wholesale-management/internal/audit/handler"

	userRepo "wholesale-management/internal/users/repository"
	userService "wholesale-management/internal/users/service"
	userHandler "wholesale-management/internal/users/handler"

	authService "wholesale-management/internal/auth/service"
	authHandler "wholesale-management/internal/auth/handler"

	invRepo "wholesale-management/internal/inventory/repository"
	invService "wholesale-management/internal/inventory/service"
	invHandler "wholesale-management/internal/inventory/handler"

	catalogRepo "wholesale-management/internal/catalog/repository"
	catalogService "wholesale-management/internal/catalog/service"
	catalogHandler "wholesale-management/internal/catalog/handler"

	supplierRepo "wholesale-management/internal/suppliers/repository"
	supplierService "wholesale-management/internal/suppliers/service"
	supplierHandler "wholesale-management/internal/suppliers/handler"

	procurementRepo "wholesale-management/internal/procurement/repository"
	procurementService "wholesale-management/internal/procurement/service"
	procurementHandler "wholesale-management/internal/procurement/handler"

	customerRepo "wholesale-management/internal/customers/repository"
	customerService "wholesale-management/internal/customers/service"
	customerHandler "wholesale-management/internal/customers/handler"

	cartRepo "wholesale-management/internal/carts/repository"
	cartService "wholesale-management/internal/carts/service"
	cartHandler "wholesale-management/internal/carts/handler"

	whatsappService "wholesale-management/internal/whatsapp/service"

	orderRepo "wholesale-management/internal/orders/repository"
	orderService "wholesale-management/internal/orders/service"
	orderHandler "wholesale-management/internal/orders/handler"

	reportService "wholesale-management/internal/reports/service"
	reportHandler "wholesale-management/internal/reports/handler"
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

	// Services
	aService := auditService.NewAuditService(aRepo)
	uService := userService.NewUserService(uRepo, aService)
	authSvc := authService.NewAuthService(uRepo, aService, cfg.JWTSecret, cfg.JWTExpirationHours)
	iService := invService.NewInventoryService(iRepo, aService, db.DB)
	catService := catalogService.NewCategoryService(catRepo, aService)
	prodService := catalogService.NewProductService(prodRepo, catRepo, iService, aService, diskStorage, db.DB)
	sService := supplierService.NewSupplierService(sRepo, aService)
	procService := procurementService.NewProcurementService(procRepo, sRepo, iService, aService, db.DB)
	custService := customerService.NewCustomerService(custRepo, aService)
	cService := cartService.NewCartService(cRepo, prodRepo, iService)
	waService := whatsappService.NewWhatsAppService(cfg.WhatsAppPhoneNumber, cfg.WhatsAppPrefix)
	oService := orderService.NewOrderService(oRepo, cRepo, custRepo, custService, iService, waService, aService, db.DB)
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
		logger.Log.Infof("Starting Wholesale Distribution API server on port %s", app.Config.ServerPort)
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
