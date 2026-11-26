# Live Integration Test Report

## 1. PostgreSQL Database (`localhost:5432`, `wholesale_management`)
- **Status**: **WORKING**
- **Evidence**: PostgreSQL `18.7` connected cleanly; migrations `000001` through `000011` applied without errors; live queries in `go test` and `verify_live_e2e.ps1` persisted and retrieved records accurately.

---

## 2. Email OTP Delivery (Gmail SMTP `smtp.gmail.com:587` STARTTLS)
- **Status**: **WORKING**
- **Startup Diagnostics** (`task-9135.log`):
  - `smtp_host=smtp.gmail.com smtp_port=587 smtp_email_loaded=true smtp_sender=he***@gmail.com smtp_password_configured=true smtp_valid=true`
  - Note: `SMTP_PASSWORD` is currently populated in root `.env` (loaded via `loadEnvFiles()` fallback), while `backend/.env` has `SMTP_PASSWORD=` empty.
- **Live Delivery Test**:
  - `POST /api/v1/auth/customer/register/initiate` to `heshankanishka831+e2e153913@gmail.com` returned `200 OK` (`verification_id=9b29140d-3448-4af1-9a94-d9dc63efc7c5`, `expires=300s`).
  - Immediate resend returned `429 COOLDOWN`.
  - Wrong OTP (`000000`) returned `400 Bad Request`.

---

## 3. WhatsApp Integration
- **Click-to-Chat (`wa.me`)**: **WORKING**
  - `WHATSAPP_STORE_NUMBER` / `WHATSAPP_PHONE_NUMBER` (`94766611606`) is configured.
  - `OrderResponse.whatsapp_url` generates a properly encoded `https://wa.me/94766611606?text=...` link containing Order Number, Customer/Guest Name, Phone, Delivery Address, Items, SKUs, Quantities, Unit Prices, Discounts, Total, and Bank Deposit receipt instructions.
- **WhatsApp Business Cloud API (`graph.facebook.com`)**: **NEEDS CONFIGURATION**
  - `WHATSAPP_CLOUD_API_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are **not configured** in `.env` or `backend/.env`.
  - Consequently, live orders record `whatsapp_notification_status = "LINK_READY"` rather than `"SENT"`.
  - Failure handling & retry (`POST /api/v1/orders/:id/whatsapp/retry`) were verified via `guest_checkout_test.go` (order is preserved when Cloud API fails).
