# Final Implementation Status — Imanya Fancy Goods

| Feature | Final Status | Automated Tests | Live API / DB | Live Browser / External | Notes |
|---|---|---|---|---|---|
| **Admin Login & RBAC** | **WORKING** | `go test` PASS | Verified (`admin@imanya.local`) | Rendered `/login` | JWT + Casbin RBAC active. |
| **Admin Dashboard & Reports** | **WORKING** | N/A (no unit test) | Verified `/reports/dashboard` | N/A | Live DB metrics; print/PDF export works; CSV export not implemented. |
| **Product, Category, Discount & Image Mgmt** | **WORKING** | `catalog/model`, `catalog/service` PASS | Verified `/public/products`, `/public/categories` | Verified `/`, `/shop` cards & images | `BroadcastChannel` sync active. |
| **Inventory & Procurement** | **WORKING** | `inventory/service` PASS | Verified stock restore on cancel | N/A | `SELECT ... FOR UPDATE` row locking active. |
| **Customer Registration & Email OTP** | **WORKING** | `auth/service`, `otp/service`, `email` PASS | Verified live OTP send, `429` cooldown, `400` invalid OTP | Rendered `/register` | Gmail SMTP `smtp.gmail.com:587` verified live. |
| **Customer Profile & Photo Upload** | **WORKING** | `disk_test.go`, `customer_photo_test.go` PASS | Endpoint live on `:8081` | UI rendered; server restarted with new binary | Supports JPG/PNG/WebP <= 5 MB with decode validation. |
| **Guest Shopping & Checkout** | **WORKING** | `guest_checkout_test.go` PASS | Verified `POST /guest/orders`, idempotency, `403`/`200` lookup, Admin visibility | Verified `/shop` -> Cart -> `/checkout` (desktop & mobile) & `/track-order` | No fake customer records created. |
| **Loyalty & Membership** | **WORKING** | `loyalty/service` PASS | Verified eligible order calculation | N/A | Skips guest orders (`CustomerID == nil`). |
| **Wishlist** | **WORKING** | N/A | Client-side `localStorage` | N/A | Cross-device DB sync not implemented. |
| **WhatsApp `wa.me` Order Link** | **WORKING** | `whatsapp/service` PASS | Verified `whatsapp_url` in live order response | N/A | Prefilled order + bank transfer instructions. |
| **WhatsApp Business Cloud API** | **NEEDS CONFIGURATION** | `guest_checkout_test.go` (failure resilience) PASS | `wa_status=LINK_READY` | Not configured | Requires `WHATSAPP_CLOUD_API_TOKEN` & `WHATSAPP_PHONE_NUMBER_ID` in `.env`. |
| **WhatsApp Payment Verification & Order Guard** | **WORKING** | `whatsapp_payment_test.go` PASS | Migration `000012` applied; `PUT /orders/:id/payment` & webhook live | Admin `OrderListPage` & `OrderDetailModal` updated | `PAYMENT_PENDING`, `RECEIPT_RECEIVED`, `PAYMENT_VERIFIED`, `PAYMENT_REJECTED`; blocks order processing until verified; no in-app receipt upload. |
| **Customer Forgot-Password OTP** | **NOT IMPLEMENTED** | N/A | No endpoint | UI link exists on `/login` | Only authenticated change-password & admin reset exist. |
