# Complete System Workflows (End-to-End)

All diagrams below reflect the **actual verified implementation** in the repository.

---

## 1. Overall System Architecture & Request Flow

```mermaid
flowchart LR
    U["Visitor / Customer / Admin"] --> FE["React SPA (:5173)"]
    FE -->|"/api/v1/*"| GIN["Gin Router (:8081)"]
    GIN -->|"Public / Guest"| PUB["OptionalAuth / RateLimit"]
    GIN -->|"Customer"| CUST["AuthMiddleware + RequireExactRole('Customer')"]
    GIN -->|"Admin"| ADM["AuthMiddleware + Casbin EnforceMiddleware"]
    PUB & CUST & ADM --> SVC["Go Services"]
    SVC --> PG[("PostgreSQL")]
    SVC --> DISK["backend/uploads"]
    SVC --> SMTP["Gmail SMTP"]
    SVC --> WA["WhatsApp Cloud API / wa.me"]
```

---

## 2. Admin Authentication Workflow

```mermaid
sequenceDiagram
    actor Admin
    participant LP as LoginPage.tsx
    participant API as POST /api/v1/auth/login
    participant AS as AuthService.Login
    participant DB as PostgreSQL (users, roles)

    Admin->>LP: Enter email/username + password
    LP->>API: POST { email, password }
    API->>AS: Validate credentials
    AS->>DB: Find user + Role preload
    AS->>AS: bcrypt.CompareHashAndPassword
    AS->>AS: Generate HS256 JWT (user_id, role_id, role_name, email)
    AS-->>LP: 200 OK { token, user }
    LP->>LP: Store token & user in localStorage
    LP->>LP: Redirect to /admin/dashboard
```

---

## 3. Customer Registration & Email OTP Verification Workflow

```mermaid
sequenceDiagram
    actor Visitor
    participant RP as RegisterPage.tsx
    participant INIT as POST /auth/customer/register/initiate
    participant OTP as OTPService
    participant SMTP as Gmail SMTP (587)
    participant VER as POST /auth/customer/register/verify-otp
    participant DB as PostgreSQL

    Visitor->>RP: Submit registration form
    RP->>INIT: POST RegisterCustomerRequest
    INIT->>DB: Check email/username uniqueness
    INIT->>OTP: IssueRegistrationOTP(email, payload)
    OTP->>DB: Store SHA-256 hashed OTP + registration payload (5m TTL)
    OTP->>SMTP: Send 6-digit OTP email to customer's email
    SMTP-->>Visitor: Deliver OTP email
    INIT-->>RP: 200 OK { verification_id, expires_in_seconds }
    Visitor->>RP: Enter 6-digit OTP
    RP->>VER: POST { verification_id, email, otp }
    VER->>OTP: VerifyAndConsume (max 5 attempts)
    VER->>DB: TX: Create users (role=Customer, email_verified=true) + customers
    VER-->>RP: 201 Created { user, email }
```

---

## 4. Product Creation & Discount Application Workflow

```mermaid
flowchart TD
    A["Admin opens ProductModal.tsx"] --> B["POST /api/v1/products or PUT /api/v1/products/:id"]
    B --> C["ProductService validates SKU, category, MOQ, discount % & dates"]
    C --> D["Save product + initialize product_stock in PostgreSQL"]
    A --> E["Upload images via POST /api/v1/products/:id/images (max 5)"]
    E --> F["DiskStorage.SaveImage (MIME + decode check, UUID filename)"]
    F --> G["Save URL in product_images"]
    D & G --> H["BroadcastChannel('imanya_catalog_sync') notifies open storefront tabs"]
    H --> I["Public catalog computes Product.EffectivePrice(now) -> ACTIVE/SCHEDULED/EXPIRED/DISABLED"]
```

---

## 5. Supplier & Procurement -> Inventory Update Workflow

```mermaid
sequenceDiagram
    actor Admin
    participant PO as PurchaseOrderListPage / GoodsReceiptModal
    participant PS as ProcurementService
    participant IS as InventoryService
    participant DB as PostgreSQL

    Admin->>PO: Select Supplier & Products -> Create PO
    PO->>PS: POST /api/v1/purchase-orders (Status: DRAFT)
    Admin->>PO: Mark ORDERED -> Open GoodsReceiptModal
    Admin->>PO: Submit received quantities
    PO->>PS: POST /api/v1/goods-receipts
    PS->>DB: TX: Create goods_receipts + update quantity_received
    PS->>IS: ReceiveStockTx(productID, qty)
    IS->>DB: SELECT FOR UPDATE product_stock -> current_stock += qty
    IS->>DB: Insert stock_movements (PURCHASE_RECEIPT)
    PS->>DB: Update PO status (PARTIALLY_RECEIVED / COMPLETED)
```

---

## 6. Inventory Adjustment Workflow

```mermaid
flowchart LR
    A["Admin: StockAdjustmentModal"] --> B["POST /api/v1/inventory/adjustments"]
    B --> C["InventoryService.AdjustStock (TX)"]
    C --> D["SELECT FOR UPDATE product_stock"]
    D --> E{"newCurrent >= allocated_stock?"}
    E -- No --> F["400 Bad Request"]
    E -- Yes --> G["Update current_stock + insert stock_movements (ADJUSTMENT) + audit_logs"]
```

---

## 7. Customer Browsing & Authenticated Shopping Workflow

```mermaid
flowchart TD
    V["Customer opens Storefront (/)"] --> C["GET /api/v1/public/categories & /public/products"]
    C --> F["Search, Category Filter, Price Range, Discount Filter, Sort"]
    F --> W["Wishlist (localStorage + live catalog sync)"]
    F --> CART["POST /api/v1/public/cart/items (X-Session-ID + optional JWT)"]
    CART --> CHK["Checkout (/checkout or CheckoutModal)"]
    CHK --> ORD["Order created -> Cart cleared -> Order Confirmation + WhatsApp Link"]
```

---

## 8. Guest Shopping & Checkout Workflow

```mermaid
sequenceDiagram
    actor Guest
    participant UI as Storefront & CartDrawer
    participant GC as GuestCheckoutPage (/checkout)
    participant API as POST /api/v1/guest/orders
    participant OS as OrderService.GuestCheckout
    participant DB as PostgreSQL
    participant WA as WhatsAppService

    Guest->>UI: Browse & Add to Cart (no login, X-Session-ID)
    Guest->>GC: Click Proceed to Checkout
    Guest->>GC: Enter Name, WhatsApp, Address, City, Province
    GC->>API: POST GuestCheckoutRequest + idempotency_key
    API->>OS: RateLimit check (10/10m)
    OS->>DB: Check idempotency_key (prevent duplicates)
    OS->>DB: TX: Validate MOQ, AllocateStockTx (FOR UPDATE), compute EffectivePrice
    OS->>DB: Insert orders (is_guest=true, customer_id=NULL, guest_access_token) + order_items
    OS->>DB: Clear guest cart
    OS->>WA: SendOrderNotification (Cloud API if configured, else LINK_READY)
    OS-->>GC: 201 Created { order_number, guest_access_token, whatsapp_url }
    GC->>Guest: Navigate to /order-confirmation/:orderNumber
```

---

## 9. Order Processing & Stock Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: Checkout / GuestCheckout (allocates stock)
    PENDING --> CONFIRMED: Admin UpdateStatus
    PENDING --> PROCESSING: Admin UpdateStatus
    CONFIRMED --> PROCESSING: Admin UpdateStatus
    CONFIRMED --> COMPLETED: DeductAllocatedStockTx
    PROCESSING --> COMPLETED: DeductAllocatedStockTx
    PENDING --> CANCELLED: CancelOrderRestockTx
    CONFIRMED --> CANCELLED: CancelOrderRestockTx
    PROCESSING --> CANCELLED: CancelOrderRestockTx
```

---

## 10. Payment & Receipt Verification Workflow (Current Manual Flow)

```mermaid
flowchart TD
    A["Order Created (Status: PENDING)"] --> B["Customer sees Online Banking / Direct Deposit instructions"]
    B --> C["Customer clicks WhatsApp link with prefilled Order Summary"]
    C --> D["Customer manually attaches bank transfer slip in WhatsApp chat"]
    D --> E["Admin manually verifies bank transfer outside system"]
    E --> F["Admin updates order status to CONFIRMED / PROCESSING / COMPLETED in OrderDetailModal"]
```
*(Note: Automated in-app payment gateway and in-app receipt image upload are **NOT IMPLEMENTED**.)*

---

## 11. WhatsApp Notification Workflow

```mermaid
flowchart TD
    A["Order Created"] --> B{"WHATSAPP_CLOUD_API_TOKEN & PHONE_NUMBER_ID set?"}
    B -- Yes --> C["POST https://graph.facebook.com/{ver}/{id}/messages"]
    C -- 2xx --> D["Update whatsapp_notification_status = SENT"]
    C -- Error --> E["Record FAILED + error message (Order preserved!)"]
    E --> F["Admin clicks 'Retry WhatsApp Alert' -> POST /orders/:id/whatsapp/retry"]
    B -- No --> G["Set status = LINK_READY & return wa.me click-to-chat URL"]
```

---

## 12. Customer Loyalty Calculation Workflow

```mermaid
flowchart LR
    A["Order status updated (registered customer only)"] --> B["LoyaltyService.RecalculateCustomer"]
    B --> C["SUM(total_amount) WHERE status IN (CONFIRMED, PROCESSING, COMPLETED, DELIVERED)"]
    C --> D["Compare against loyalty_settings thresholds (BRONZE < SILVER < GOLD < PLATINUM)"]
    D --> E["Update customers.membership_tier & customers.lifetime_spent"]
```

---

## 13. Customer Profile, Photo & Wishlist Workflow

```mermaid
flowchart TD
    A["Customer opens /profile"] --> B["CustomerProfileSection loads GET /customer/profile"]
    B --> C["Selects JPG/PNG/WebP <= 5MB -> Local Preview"]
    C --> D["POST /customer/profile/photo -> DiskStorage validates & saves"]
    D --> E["Updates customers.profile_photo_url -> deletes old photo -> updates AuthContext & Navbar"]
    B --> F["DELETE /customer/profile/photo -> clears URL & deletes file"]
    W["Wishlist Heart Click"] --> WS["WishlistContext persists to localStorage + syncs prices via BroadcastChannel"]
```

---

## 14. Admin Reporting Workflow

```mermaid
flowchart LR
    A["Admin opens /admin/reports"] --> B{"Report Type"}
    B -- Sales --> C["GET /api/v1/reports/sales?period=weekly|monthly|all"]
    B -- Inventory --> D["GET /api/v1/products?limit=200 (client-side valuation)"]
    B -- Procurement --> E["GET /suppliers & /purchase-orders"]
    C & D & E --> F["Browser Print / Save as PDF (window.print)"]
```
*(Note: Dedicated CSV/Excel export endpoints are **NOT IMPLEMENTED**.)*
