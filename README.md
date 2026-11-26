# Imanya Fancy Goods — Import & Distribution Management System

A full-stack, modular web application for **Imanya Fancy Goods** import, wholesale/retail product distribution, customer shopping (authenticated & guest checkout), and business administration.

---

## Architecture & Technology Stack

Implemented as a **Modular Monolith** backend with domain separation and a **Feature-Based React SPA** frontend:

- **Backend (`backend/`)**
  - **Go 1.27.4** with **Gin** (`github.com/gin-gonic/gin v1.12.0`)
  - **GORM** (`gorm.io/gorm`) with **PostgreSQL (`pgx/v5`)** and prepared statement caching
  - **Casbin RBAC** (`casbin/v3` + `gorm-adapter/v3`) for role-based admin authorization
  - **JWT Authentication** (HS256 bearer tokens) & **bcrypt** password hashing
  - **Email OTP Verification** via Gmail SMTP (`smtp.gmail.com:587` STARTTLS)
  - **WhatsApp Integration**: Prefilled `wa.me` click-to-chat URLs + optional WhatsApp Business Cloud API notifications
  - **Local Disk Image Storage** (`/uploads`) with MIME sniffing, image decode validation, and `X-Content-Type-Options: nosniff`
  - **Uber-Zap** structured logging with `X-Request-ID` correlation

- **Frontend (`frontend/`)**
  - **React 18** + **TypeScript 5.7** + **Vite 6** (dev server on port `5173`, proxying `/api` and `/uploads` to `http://127.0.0.1:8081`)
  - **Tailwind CSS 3.4** & **Lucide React** icons
  - **React Router v6** with lazy-loaded routes and role-guarded `ProtectedRoute`
  - **Axios** client (`frontend/src/services/api.ts`) with JWT injection, `X-Session-ID` guest cart tracking, and 15s request timeout

- **Database**
  - **PostgreSQL 18.7** (database: `wholesale_management`)
  - Versioned SQL migrations (`000001` through `000011`) in `backend/migrations/`
  - Concurrency-safe inventory updates using pessimistic row locking (`SELECT ... FOR UPDATE`)

---

## Workspace Structure

```text
New project/
├── backend/
│   ├── cmd/api/main.go                 # API server entry point
│   ├── cmd/migrate/main.go             # Database migration runner
│   ├── internal/
│   │   ├── app/                        # Dependency wiring & Gin router
│   │   ├── audit/                      # Audit log tracking
│   │   ├── auth/                       # Login, JWT & OTP-gated registration
│   │   ├── carts/                      # Session & customer shopping carts
│   │   ├── catalog/                    # Categories, products, images, discounts, MOQ
│   │   ├── config/                     # Multi-path .env configuration loader
│   │   ├── customers/                  # Customer profiles, addresses, profile photos, admin directory
│   │   ├── inventory/                  # Stock balances, row-locking & movement ledger
│   │   ├── loyalty/                    # Membership tiers (BRONZE–PLATINUM) & thresholds
│   │   ├── orders/                     # Authenticated & Guest checkout, tracking & status workflow
│   │   ├── otp/                        # SHA-256 hashed email OTP verification
│   │   ├── platform/                   # Postgres, Zap logger, middleware, SMTP mailer, disk storage
│   │   ├── procurement/                # Purchase orders & goods receiving
│   │   ├── reports/                    # Admin dashboard KPIs & sales reports
│   │   ├── suppliers/                  # Supplier directory
│   │   ├── users/                      # Staff accounts & role management
│   │   └── whatsapp/                   # WhatsApp order message & Cloud API sender
│   ├── migrations/                     # SQL migrations (000001..000011)
│   ├── uploads/                        # Uploaded product & profile images
│   ├── .env.example                    # Environment configuration template
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── app/App.tsx                 # Routes & context providers
│   │   ├── components/                 # Shared UI (Avatar, Modal, Badge, Navbar, Sidebar, etc.)
│   │   ├── features/                   # Auth, Storefront, Cart, Guest Checkout, Orders, Admin modules
│   │   ├── layouts/                    # StorefrontLayout, AdminLayout, AuthLayout
│   │   ├── services/                   # Axios instance & typed API endpoints
│   │   ├── types/                      # TypeScript domain models
│   │   └── utils/                      # Formatters, WhatsApp helper, BroadcastChannel catalog sync
│   ├── package.json
│   └── vite.config.ts
├── docs/                               # Architecture, workflows, DB, API, security & test reports
└── README.md
```

---

## Quick Start Guide (Windows PowerShell)

### 1. Prerequisites
- **Go**: `1.27+`
- **Node.js**: `v20+` with `npm`
- **PostgreSQL**: `18+` running on `localhost:5432` with database `wholesale_management` created

### 2. Configure Environment
Copy `backend/.env.example` to `backend/.env` and fill in your PostgreSQL, JWT, WhatsApp, and Gmail SMTP (`SMTP_EMAIL` + Google App Password `SMTP_PASSWORD`) settings.

### 3. Apply Database Migrations
```powershell
cd "C:\Users\Heshan - Work\Desktop\New project\backend"
go run cmd/migrate/main.go
```
*(The API server also runs migrations automatically on startup.)*

### 4. Start the Backend API (`:8081`)
```powershell
cd "C:\Users\Heshan - Work\Desktop\New project\backend"
go run cmd/api/main.go
```
- API Base URL: `http://127.0.0.1:8081/api/v1`
- Health Check: `http://127.0.0.1:8081/api/v1/health`

### 5. Start the Frontend (`:5173`)
In a second PowerShell window:
```powershell
cd "C:\Users\Heshan - Work\Desktop\New project\frontend"
npm run dev
```
- Storefront & Admin Portal: **http://localhost:5173**

---

## Default Seed Credentials

| Role | Username | Email | Password |
|---|---|---|---|
| **Super Administrator** | `superadmin` | `admin@imanya.local` | `Admin@123456` |

---

## Key Features

1. **Storefront & Guest Shopping (`/`, `/shop`, `/categories`)**: Product browsing, search, category/price/discount filters, quick view, wishlist (`localStorage` synced via `BroadcastChannel`), and persistent session cart enforcing MOQ and live stock.
2. **Guest Checkout & Order Tracking (`/checkout`, `/order-confirmation/:orderNumber`, `/track-order`)**: Guests can place orders without registering or logging in; orders use idempotency keys, server-side pricing/discounts, nullable `customer_id`, and token/phone-verified tracking.
3. **Customer Portal (`/register`, `/login`, `/profile`, `/orders`, `/membership`)**: Gmail SMTP OTP registration & email change, structured residential/delivery addresses, circular profile photo upload/replacement/removal (JPG/PNG/WebP up to 5 MB), order history, and automatic loyalty tier upgrades (`BRONZE`, `SILVER`, `GOLD`, `PLATINUM`).
4. **Admin Operations (`/admin/*`)**: Live KPI dashboard, product & time-windowed discount management, inventory adjustments & movement ledger, supplier & PO goods receiving, centralized registered/guest order processing, customer directory, sales/inventory/procurement reports, staff RBAC, and audit logs.

---

## Testing & Build

```powershell
# Backend tests
cd "C:\Users\Heshan - Work\Desktop\New project\backend"
go test -count=1 ./...

# Frontend type-check & production build
cd "C:\Users\Heshan - Work\Desktop\New project\frontend"
npm run build
```

---

## Additional Documentation

Full technical documentation, Mermaid workflow diagrams, database ER schema, API reference, security audit, and test reports are available in `docs/`:
- [PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | [PROJECT_ARCHITECTURE.md](docs/PROJECT_ARCHITECTURE.md) | [COMPLETE_SYSTEM_WORKFLOW.md](docs/COMPLETE_SYSTEM_WORKFLOW.md)
- [DATABASE_DOCUMENTATION.md](docs/DATABASE_DOCUMENTATION.md) | [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)
- [FINAL_IMPLEMENTATION_STATUS.md](docs/FINAL_IMPLEMENTATION_STATUS.md) | [FUNCTIONAL_TESTING_REPORT.md](docs/FUNCTIONAL_TESTING_REPORT.md) | [RECOMMENDED_DEVELOPMENT_ROADMAP.md](docs/RECOMMENDED_DEVELOPMENT_ROADMAP.md)
