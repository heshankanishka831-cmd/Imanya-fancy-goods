package app

import (
	"net/http"
	"time"

	"distribution-management/internal/config"
	"distribution-management/internal/platform/middleware"
	"distribution-management/internal/platform/response"

	auditHandler "distribution-management/internal/audit/handler"
	authHandler "distribution-management/internal/auth/handler"
	cartHandler "distribution-management/internal/carts/handler"
	catalogHandler "distribution-management/internal/catalog/handler"
	customerHandler "distribution-management/internal/customers/handler"
	invHandler "distribution-management/internal/inventory/handler"
	loyaltyHandler "distribution-management/internal/loyalty/handler"
	orderHandler "distribution-management/internal/orders/handler"
	procurementHandler "distribution-management/internal/procurement/handler"
	reportHandler "distribution-management/internal/reports/handler"
	supplierHandler "distribution-management/internal/suppliers/handler"
	userHandler "distribution-management/internal/users/handler"

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
	loyaltyHdlr *loyaltyHandler.LoyaltyHandler,
) *gin.Engine {
	if cfg.ServerEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global Middlewares
	r.Use(middleware.LoggingMiddleware())
	r.Use(middleware.RecoveryMiddleware())
	r.Use(middleware.CORSMiddleware(cfg.CORSAllowedOrigins))

	// Static uploads directory with nosniff security header
	uploadsGroup := r.Group("/uploads")
	uploadsGroup.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Next()
	})
	uploadsGroup.Static("/", cfg.UploadDir)

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

		// Authentication & Verified Registration OTP Flows
		v1.POST("/auth/login", authHdlr.Login)
		v1.POST("/auth/register", authHdlr.RegisterCustomer)
		v1.POST("/auth/customer/register", authHdlr.RegisterCustomer)
		v1.POST("/auth/customer/register/initiate", middleware.RateLimitMiddleware(10, 10*time.Minute, "reg-init"), authHdlr.InitiateRegistration)
		v1.POST("/auth/customer/register/verify-otp", middleware.RateLimitMiddleware(15, 10*time.Minute, "reg-verify"), authHdlr.VerifyRegistrationOTP)
		v1.POST("/auth/customer/register/resend-otp", middleware.RateLimitMiddleware(8, 10*time.Minute, "reg-resend"), authHdlr.ResendRegistrationOTP)

		// Public Storefront (With Optional Customer Auth)
		pub := v1.Group("/public", middleware.OptionalAuthMiddleware(cfg.JWTSecret))
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
			pub.GET("/membership/tiers", loyaltyHdlr.GetSettings)
		}

		// Guest Checkout & Secure Order Lookup (no authentication required, rate-limited)
		guest := v1.Group("/guest")
		{
			guest.POST("/orders", middleware.RateLimitMiddleware(10, 10*time.Minute, "guest-checkout"), oHdlr.GuestCheckout)
			guest.GET("/orders/:orderNumber", middleware.RateLimitMiddleware(30, 10*time.Minute, "guest-order-lookup"), oHdlr.GetGuestOrder)
		}

		// WhatsApp Cloud API Webhook (active only when WHATSAPP_WEBHOOK_VERIFY_TOKEN is configured)
		oHdlr.SetWebhookVerifyToken(cfg.WhatsAppWebhookVerifyToken)
		v1.GET("/webhooks/whatsapp", oHdlr.WhatsAppWebhookVerify)
		v1.POST("/webhooks/whatsapp", oHdlr.WhatsAppWebhookReceive)

		// Authenticated Customer Endpoints (strictly Customer role + ownership via authenticated identity)
		cust := v1.Group("/customer", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireExactRole("Customer"))
		{
			cust.GET("/profile", custHdlr.GetMyProfile)
			cust.PUT("/profile", custHdlr.UpdateMyProfile)
			cust.POST("/profile/photo", custHdlr.UploadMyProfilePhoto)
			cust.DELETE("/profile/photo", custHdlr.RemoveMyProfilePhoto)
			cust.POST("/profile/email/initiate", middleware.RateLimitMiddleware(8, 10*time.Minute, "email-init"), custHdlr.InitiateEmailChange)
			cust.POST("/profile/email/verify", middleware.RateLimitMiddleware(15, 10*time.Minute, "email-verify"), custHdlr.VerifyEmailChange)
			cust.POST("/profile/email/resend", middleware.RateLimitMiddleware(8, 10*time.Minute, "email-resend"), custHdlr.ResendEmailChangeOTP)
			cust.POST("/change-password", custHdlr.ChangePassword)
			cust.GET("/membership", loyaltyHdlr.GetMyMembership)
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
			admin.PUT("/orders/:id/payment", oHdlr.UpdatePaymentStatus)
			admin.GET("/orders/:id/whatsapp", oHdlr.GetWhatsAppLink)
			admin.POST("/orders/:id/whatsapp/retry", oHdlr.RetryWhatsAppNotification)

			// Customers
			admin.GET("/customers", custHdlr.List)
			admin.GET("/customers/:id", custHdlr.GetCustomerByID)
			admin.PUT("/customers/:id", custHdlr.AdminUpdateCustomer)
			admin.PUT("/customers/:id/status", custHdlr.UpdateCustomerStatus)
			admin.POST("/customers/:id/reset-password", custHdlr.AdminResetPassword)

			// Loyalty & Customer Membership
			admin.GET("/membership/settings", loyaltyHdlr.GetSettings)
			admin.PUT("/membership/settings", loyaltyHdlr.UpdateSettings)
			admin.GET("/membership/stats", loyaltyHdlr.GetStats)
			admin.GET("/membership/customers", loyaltyHdlr.ListCustomers)
			admin.POST("/membership/recalculate/:id", loyaltyHdlr.RecalculateCustomer)

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
	return time.Now().UTC().Format(time.RFC3339)
}
