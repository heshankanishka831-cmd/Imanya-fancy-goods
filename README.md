# Import & Wholesale Distribution Management System

A production-grade, secure, web-based management system built specifically for commercial import and wholesale distribution operations.

## Architecture & Technology Stack

The solution is implemented as a **Modular Monolith** with clean domain separation:

- **Backend:**
  - **Go 1.27+** with the **Gin Web Framework** (RESTful JSON API)
  - **GORM ORM** with native PostgreSQL driver
  - **Casbin RBAC** for fine-grained authorization (`casbin_rule` database persistence)
  - **JWT Authentication** (stateless HMAC-SHA256 bearer tokens)
  - **Argon2id / Bcrypt** cryptographic password hashing
  - **Uber-Zap** structured JSON logging with correlation `X-Request-ID`
  - **go-playground/validator/v10** for API boundary validation
  - **golang-migrate** compatible SQL versioned migrations

- **Frontend:**
  - **React 18** with **TypeScript** and **Vite**
  - **Tailwind CSS** for modern, responsive UI styling
  - **React Router v6** with role-guarded protected routes
  - **Centralized Axios API Client** with automatic token injection and error interceptors
  - **Lucide React** icons

- **Database & System of Record:**
  - **PostgreSQL 18.7** (database: `wholesale_management`)
  - Concurrency-safe inventory ledger with pessimistic row locking (`SELECT ... FOR UPDATE`)
  - PostgreSQL is the sole system of record; WhatsApp Click-to-Chat is an external client communication channel.

---

## Workspace Directory Structure

```
wholesale-management/
├── backend/
│   ├── cmd/api/main.go                 # Server entry point & graceful shutdown
│   ├── internal/
│   │   ├── app/                        # Bootstrapping, router & dependency injection
│   │   ├── config/                     # Environment variable loader
│   │   ├── platform/                   # Shared infrastructure: database, logger, middleware, storage
│   │   ├── audit/                      # Structured audit logging service & handler
│   │   ├── auth/                       # Login handler, password verification & JWT generator
│   │   ├── users/                      # User management & role assignment
│   │   ├── catalog/                    # Products, categories, product images, public catalog
│   │   ├── inventory/                  # Stock balances, row-locking & movement ledger
│   │   ├── suppliers/                  # Supplier directory & contact management
│   │   ├── procurement/                # Purchase orders, PO items & goods receiving
│   │   ├── customers/                  # Customer profiles & order tracking
│   │   ├── carts/                      # Server-side shopping cart with stock validation
│   │   ├── orders/                     # Atomic checkout transaction & status state machine
│   │   ├── whatsapp/                   # WhatsApp click-to-chat URL builder
│   │   └── reports/                    # Executive KPI dashboard & operational metrics
│   ├── migrations/                     # Versioned SQL migrations (up/down)
│   ├── .env.example                    # Sample environment variables
│   ├── .env                            # Active environment configuration
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── src/
│   │   ├── app/App.tsx                 # Root router & context providers
│   │   ├── components/                 # UI primitives (Button, Modal, Input, Badge, Table, etc.)
│   │   ├── features/                   # Feature modules: auth, storefront, cart, catalog, inventory, etc.
│   │   ├── layouts/                    # AdminLayout, StorefrontLayout, AuthLayout
│   │   ├── services/api.ts             # Centralized Axios client
│   │   ├── types/index.ts              # TypeScript domain interfaces
│   │   └── utils/                      # Currency formatters & WhatsApp link generator
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── PROJECT_SPECIFICATION.md            # Primary requirements baseline document
├── README.md                           # This setup and execution guide
└── .gitignore
```

---

## Quick Start Guide (Windows PowerShell)

### 1. Prerequisites
- **Go:** 1.27+ installed
- **Node.js:** v20+ or v22+ with `npm` installed
- **PostgreSQL:** 18+ running on `localhost:5432` with database `wholesale_management` created.

### 2. Database Migration & Seed Data
The database migrations are located in `backend/migrations/`:
- `000001_init_schema.up.sql` creates all normalized tables, foreign keys, indexes, and constraints.
- `000002_seed_initial_data.up.sql` seeds default roles, categories, products, stock levels, and the Super Administrator account.

You can apply them using `psql` or let the backend run them automatically on startup:
```powershell
# Using psql on Windows (optional manual migration):
psql -U postgres -d wholesale_management -f "C:\Users\Heshan - Work\Desktop\New project\backend\migrations\000001_init_schema.up.sql"
psql -U postgres -d wholesale_management -f "C:\Users\Heshan - Work\Desktop\New project\backend\migrations\000002_seed_initial_data.up.sql"
```

### 3. Running the Backend Server
```powershell
cd "C:\Users\Heshan - Work\Desktop\New project\backend"
go run cmd/api/main.go
```
The backend API server will listen on `http://localhost:8080`.  
Health check endpoint: `http://localhost:8080/api/v1/health`

### 4. Running the Frontend Portal
In a second PowerShell window:
```powershell
cd "C:\Users\Heshan - Work\Desktop\New project\frontend"
npm run dev
```
The customer storefront and admin portal will be available at:  
👉 **http://localhost:5173**

---

## Default Seed Credentials

| Role | Username | Email Address | Password |
|---|---|---|---|
| **Super Administrator** | `superadmin` | `admin@wholesale.local` | `Admin@123456` |

*(You can also use the "Fill Demo Credentials" helper on the `/login` page).*

---

## Key Functional Highlights

1. **Customer Storefront (`/`):**
   - Public product browsing with real-time stock indicator (`In Stock` vs `Out of Stock`).
   - Category filtering and SKU search.
   - Server-side shopping cart with stock quantity revalidation.
   - One-click checkout generating a recorded order in PostgreSQL and an optional **WhatsApp Click-to-Chat** confirmation message.

2. **Admin Operations Dashboard (`/admin/dashboard`):**
   - Real-time KPI summary (Active Products, Low Stock Watchlist, Total Order Volume, Pending Orders).
   - Direct access to order management and stock reconciliation.

3. **Catalogue & Pricing Management (`/admin/products` & `/admin/categories`):**
   - Product CRUD with SKU uniqueness checks.
   - Cost prices and margin calculations are strictly confidential and stripped from public responses.
   - Safe image uploading with MIME byte sniffing (JPEG, PNG, WEBP).

4. **Procurement & Goods Receiving (`/admin/procurement`):**
   - Purchase order creation with supplier line items and agreed purchase costs.
   - Goods receipt logging with actual received quantities (supports partial receiving).
   - Inward goods automatically increase physical stock and append an immutable `RECEIVING` record to the stock ledger.

5. **Inventory Balances & Movement Ledger (`/admin/inventory`):**
   - Real-time stock levels with allocated stock tracking.
   - Pessimistic locking (`SELECT ... FOR UPDATE`) prevents concurrent overselling during simultaneous checkout attempts.
   - Full historical audit ledger of all movements (`RECEIVING`, `ORDER_ALLOCATION`, `ORDER_DEDUCTION`, `ADJUSTMENT`, `CANCELLATION_RESTOCK`).

6. **Order Fulfillment & WhatsApp Click-to-Chat (`/admin/orders`):**
   - Atomic checkout snapshotting item prices and product details at purchase time.
   - Documented status workflow: `PENDING` &rarr; `CONFIRMED` &rarr; `PROCESSING` &rarr; `COMPLETED`.
   - Cancelling an order automatically restocks allocated inventory within a database transaction.
   - Outbound WhatsApp Click-to-Chat link with readable order summary and line totals.

7. **System Traceability & Audit Logs (`/admin/audit`):**
   - Captures actor ID, action type, entity name, entity ID, client IP address, and before/after JSON state diffs for critical mutations.

---

## Testing & Verification

Run the backend unit test suite:
```powershell
cd "C:\Users\Heshan - Work\Desktop\New project\backend"
go test -v ./...
```

Run the frontend TypeScript verification and production build:
```powershell
cd "C:\Users\Heshan - Work\Desktop\New project\frontend"
npm run build
```
