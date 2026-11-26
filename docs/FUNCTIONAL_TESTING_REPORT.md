# Functional Testing Report — Imanya Fancy Goods

**Verification Date**: 2026-11-25  
**Target Stack**: Go 1.27.4 + Gin (`127.0.0.1:8081`), React 18 + TypeScript + Vite (`localhost:5173`), PostgreSQL 18.7 (`wholesale_management`).

---

## 1. Automated Backend Tests (`cd backend; go test -count=1 ./...`)
All 14 tested Go packages passed (`exit code 0`):
- `internal/auth/service` (PostgreSQL integration: email-as-username + OTP registration) — **PASS** (`1.577s`)
- `internal/catalog/model` & `internal/catalog/service` (E2E admin discount -> cart -> checkout -> history) — **PASS** (`0.539s` / `1.050s`)
- `internal/config` (`.env` loading & SMTP validation) — **PASS** (`0.607s`)
- `internal/customers/handler` & `internal/customers/service` (profile CRUD, photo upload/replace/remove lifecycle) — **PASS** (`0.367s` / `1.048s`)
- `internal/inventory/service` (row-locked stock allocation, adjustment, deduction) — **PASS** (`0.787s`)
- `internal/loyalty/service` (tier thresholds & eligible spend calculation) — **PASS** (`0.705s`)
- `internal/orders/service` (guest checkout, idempotency, MOQ, stock, token/phone lookup, WhatsApp failure resilience) — **PASS** (`0.514s`)
- `internal/otp/service` (SHA-256 OTP, 5m expiry, 5-attempt lockout, cooldown, multi-provider routing) — **PASS** (`1.807s`)
- `internal/platform/email`, `middleware`, `storage`, `whatsapp/service` — **PASS**

---

## 2. Live API & PostgreSQL Functional Checks
Verified directly against `http://127.0.0.1:8081/api/v1` and PostgreSQL:
1. **Health Check**: `GET /api/v1/health` -> `200 OK` (`status: healthy`).
2. **Public Catalog & Guest Cart**: `GET /public/categories` (1 category), `GET /public/products?limit=50` (3 products), `POST /public/cart/items` with `X-Session-ID` (no JWT) -> `200 OK` (`total_amount: 65`).
3. **Guest Checkout & Idempotency**: `POST /guest/orders` -> `201 Created` (`ORD-20261125-85da43`, `is_guest=True`, `customer_id=null`). Re-submitting with the same `idempotency_key` returned the exact same order number without duplicating the order or stock allocation.
4. **Secure Guest Order Lookup**: `GET /guest/orders/{orderNumber}` without `token`/`phone` -> `403 Forbidden`. Lookup with matching `phone` or `token` -> `200 OK`.
5. **Admin Login, Dashboard & Order Workflow**: `POST /auth/login` (`admin@imanya.local`) -> `200 OK` (`Super Administrator`). `GET /reports/dashboard` returned live DB metrics (`products=3, customers=2, orders=2`). `GET /orders?customer_type=guest` listed the new guest order. `PUT /orders/{id}/status` (`CANCELLED`) cleanly restored allocated stock. `GET /customers?limit=5` returned 2 records.

---

## 3. Browser UI Functional Checks (`http://localhost:5173`)
Verified via live browser automation:
- **Storefront (`/`, `/shop`)**: Uniform product cards (`285.2px` × `501.1px`), `/logo.png` and `/uploads/*.jpg` images loaded with 0 broken images, 0 console errors, 0 HTTP 4xx/5xx errors.
- **Cart -> Guest Checkout (`/checkout`)**: Adding an item opened Cart Drawer (`Your Shopping Cart (1)`), clicking **Proceed to Checkout** navigated to `/checkout`, and all Customer Info, Delivery Info, and Order Summary sections rendered cleanly at `1280x800` and `375x812` with zero horizontal overflow.
- **Additional Routes**: `/track-order`, `/login`, and `/register` rendered cleanly with 0 console errors.
