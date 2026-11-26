# Imanya Fancy Goods — Project Overview

## 1. Purpose & Business Domain
**Imanya Fancy Goods** is a full-stack Import, Wholesale/Retail Product Distribution, Customer Storefront, and Administration Management Web Application.

It serves two primary user groups:
1. **Storefront Visitors & Registered Customers**: Browse products and categories, search and filter by price/stock/discounts, manage a persistent wishlist, add items to a session-backed shopping cart (enforcing minimum order quantities and live stock), place orders either as a **Guest** (without login) or as an **Authenticated Customer** (with loyalty tier tracking, order history, and profile/photo management).
2. **Administrators & Staff** (`Super Administrator`, `Inventory Manager`, `Order Manager`): Manage categories, products, product images, product discounts, inventory stock adjustments, suppliers, purchase orders, goods receipts, customer directory, customer orders (both registered and guest), loyalty tier thresholds, sales/inventory/procurement reports, staff users, and audit logs.

---

## 2. Verified Technology Stack

### Backend (`backend/go.mod`)
- **Language**: Go `1.27.4`
- **Web Framework**: Gin (`github.com/gin-gonic/gin v1.12.0`)
- **ORM / Database Driver**: GORM (`gorm.io/gorm v1.31.2`, `gorm.io/driver/postgres v1.6.3`, `pgx/v5 v5.10.0`)
- **Database**: PostgreSQL (verified running PostgreSQL `18.7`)
- **Authentication**: JWT (`github.com/golang-jwt/jwt/v5 v5.3.1`), bcrypt (`golang.org/x/crypto v0.48.0`)
- **Authorization (RBAC)**: Casbin (`github.com/casbin/casbin/v3 v3.8.1` + `gorm-adapter/v3 v3.41.0`)
- **Logging**: Uber Zap (`go.uber.org/zap v1.28.0`)
- **Configuration**: `github.com/joho/godotenv v1.5.1`
- **Testing**: `github.com/stretchr/testify v1.11.1`, `github.com/glebarez/sqlite v1.11.0` (unit tests), live PostgreSQL (integration tests)

### Frontend (`frontend/package.json`)
- **Framework**: React `18.3.1` + TypeScript `5.7.3`
- **Build Tool / Dev Server**: Vite `6.1.0` (dev port `5173`, proxies `/api` and `/uploads` to `http://127.0.0.1:8081`)
- **Routing**: `react-router-dom v6.28.2`
- **HTTP Client**: Axios `1.7.9` (15s timeout, auto-injects `Authorization` Bearer JWT and `X-Session-ID`)
- **Styling**: Tailwind CSS `3.4.17`
- **Icons**: `lucide-react v0.475.0`

### External & Platform Integrations
- **Email OTP Delivery**: Gmail SMTP (`smtp.gmail.com:587` with STARTTLS) via `backend/internal/platform/email/mailer.go`
- **WhatsApp Order Notifications**:
  - `wa.me` click-to-chat URL generation with structured order summary (`backend/internal/whatsapp/service/whatsapp_service.go`)
  - Optional WhatsApp Business Cloud API (`graph.facebook.com`) when `WHATSAPP_CLOUD_API_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are configured
- **File & Image Storage**: Local disk storage (`./uploads`, max 5 MB, JPG/PNG/WebP with magic-byte + image decode validation) served at `/uploads` with `X-Content-Type-Options: nosniff`.
