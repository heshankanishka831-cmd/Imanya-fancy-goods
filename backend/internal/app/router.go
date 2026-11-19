package app

import (
	"net/http"

	"wholesale-management/internal/config"
	"wholesale-management/internal/platform/middleware"
	"wholesale-management/internal/platform/response"

	auditHandler "wholesale-management/internal/audit/handler"
	authHandler "wholesale-management/internal/auth/handler"
	cartHandler "wholesale-management/internal/carts/handler"
	catalogHandler "wholesale-management/internal/catalog/handler"
	customerHandler "wholesale-management/internal/customers/handler"
	invHandler "wholesale-management/internal/inventory/handler"
	orderHandler "wholesale-management/internal/orders/handler"
	procurementHandler "wholesale-management/internal/procurement/handler"
	reportHandler "wholesale-management/internal/reports/handler"
	supplierHandler "wholesale-management/internal/suppliers/handler"
	userHandler "wholesale-management/internal/users/handler"

	"github.com/gin-gonic/gin"
)

func SetupRouter(
	cfg *config.Config,
	casbinSvc *middleware.CasbinService,
	authHdlr *authHandler.AuthHandler,
	uHdlr *userHandler.UserHandler,
	catHdlr *catalogHandler.CategoryHandler,
	prodHdlr *catalogHandler.ProductHandler,
	pubCatHdlr *catalogHandler.PublicCatalogHandler,
	invHdlr *invHandler.InventoryHandler,
	sHdlr *supplierHandler.SupplierHandler,
	procHdlr *procurementHandler.ProcurementHandler,
	custHdlr *customerHandler.CustomerHandler,
	cartHdlr *cartHandler.CartHandler,
	oHdlr *orderHandler.OrderHandler,
	repHdlr *reportHandler.ReportHandler,
	aHdlr *auditHandler.AuditHandler,
) *gin.Engine {
	if cfg.ServerEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global Middlewares
	r.Use(middleware.LoggingMiddleware())
	r.Use(middleware.RecoveryMiddleware())
	r.Use(middleware.CORSMiddleware(cfg.CORSAllowedOrigins))

	// Static uploads directory
	r.Static("/uploads", cfg.UploadDir)

	// API v1 Group
	v1 := r.Group("/api/v1")
	{
		// Health Check
		v1.GET("/health", func(c *gin.Context) {
			response.Success(c, http.StatusOK, gin.H{
				"status":    "healthy",
				"version":   "1.0.0",
				"timestamp": timeNow(),
			})
		})

		// Authentication
		v1.POST("/auth/login", authHdlr.Login)
		v1.POST("/auth/register", authHdlr.RegisterCustomer)
		v1.POST("/auth/customer/register", authHdlr.RegisterCustomer)

		// Public Storefront (No Auth Required)
		pub := v1.Group("/public")
		{
			pub.GET("/categories", pubCatHdlr.ListCategories)
			pub.GET("/products", pubCatHdlr.ListProducts)
			pub.GET("/products/:id", pubCatHdlr.GetProduct)

			// Shopping Cart & Checkout
			pub.GET("/cart", cartHdlr.GetCart)
			pub.POST("/cart/items", cartHdlr.AddItem)
			pub.PUT("/cart/items/:itemId", cartHdlr.UpdateItem)
			pub.DELETE("/cart/items/:itemId", cartHdlr.DeleteItem)
			pub.POST("/checkout", oHdlr.Checkout)
			pub.GET("/orders/:id", oHdlr.GetOrder)
			pub.GET("/orders/:id/whatsapp", oHdlr.GetWhatsAppLink)
		}

		// Authenticated Customer Endpoints
		cust := v1.Group("/customer", middleware.AuthMiddleware(cfg.JWTSecret))
		{
			cust.GET("/profile", custHdlr.GetMyProfile)
			cust.PUT("/profile", custHdlr.UpdateMyProfile)
			cust.GET("/orders", oHdlr.ListOrders)
			cust.GET("/orders/:id", oHdlr.GetOrder)
			cust.GET("/orders/:id/whatsapp", oHdlr.GetWhatsAppLink)
		}

		// Protected Administration Endpoints (JWT Auth + Casbin RBAC)
		admin := v1.Group("", middleware.AuthMiddleware(cfg.JWTSecret), casbinSvc.EnforceMiddleware())
		{
			// Users & Roles
			admin.GET("/users", uHdlr.ListUsers)
			admin.POST("/users", uHdlr.CreateUser)
			admin.GET("/users/:id", uHdlr.GetUser)
			admin.PUT("/users/:id/status", uHdlr.UpdateStatus)
			admin.GET("/roles", uHdlr.GetRoles)

			// Categories
			admin.GET("/categories", catHdlr.List)
			admin.POST("/categories", catHdlr.Create)
			admin.GET("/categories/:id", catHdlr.GetByID)
			admin.PUT("/categories/:id", catHdlr.Update)
			admin.DELETE("/categories/:id", catHdlr.Delete)

			// Products
			admin.GET("/products", prodHdlr.List)
			admin.POST("/products", prodHdlr.Create)
			admin.GET("/products/:id", prodHdlr.GetByID)
			admin.PUT("/products/:id", prodHdlr.Update)
			admin.DELETE("/products/:id", prodHdlr.Delete)
			admin.POST("/products/:id/images", prodHdlr.UploadImage)
			admin.DELETE("/products/:id/images/:imageId", prodHdlr.DeleteImage)

			// Inventory & Stock Movements
			admin.POST("/inventory/adjustments", invHdlr.AdjustStock)
			admin.GET("/inventory/low-stock", invHdlr.GetLowStock)
			admin.GET("/stock-movements", invHdlr.ListMovements)

			// Suppliers
			admin.GET("/suppliers", sHdlr.List)
			admin.POST("/suppliers", sHdlr.Create)
			admin.GET("/suppliers/:id", sHdlr.GetByID)
			admin.PUT("/suppliers/:id", sHdlr.Update)
			admin.DELETE("/suppliers/:id", sHdlr.Delete)

			// Procurement (POs & Goods Receiving)
			admin.GET("/purchase-orders", procHdlr.ListPOs)
			admin.POST("/purchase-orders", procHdlr.CreatePO)
			admin.GET("/purchase-orders/:id", procHdlr.GetPO)
			admin.PUT("/purchase-orders/:id/status", procHdlr.UpdatePOStatus)
			admin.POST("/goods-receipts", procHdlr.CreateGoodsReceipt)

			// Orders
			admin.GET("/orders", oHdlr.ListOrders)
			admin.GET("/orders/:id", oHdlr.GetOrder)
			admin.PUT("/orders/:id/status", oHdlr.UpdateStatus)
			admin.GET("/orders/:id/whatsapp", oHdlr.GetWhatsAppLink)

			// Customers
			admin.GET("/customers", custHdlr.List)
			admin.GET("/customers/:id", custHdlr.GetCustomerByID)

			// Reporting Dashboard & Sales Reports
			admin.GET("/reports/dashboard", repHdlr.GetDashboard)
			admin.GET("/reports/sales", repHdlr.GetSalesReport)

			// Audit Trail
			admin.GET("/audit-logs", aHdlr.ListLogs)
		}
	}

	return r
}

func timeNow() string {
	return "2026-11-19T09:00:00Z"
}
