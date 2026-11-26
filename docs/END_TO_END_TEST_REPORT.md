# End-to-End Test Report — Imanya Fancy Goods

## 1. End-to-End Scenarios Executed

| Scenario | Method | Outcome | Verified Evidence |
|---|---|---|---|
| **E2E-01: Guest Browse -> Cart -> Checkout -> DB -> Admin -> Cancel** | Live HTTP API + PostgreSQL (`verify_live_e2e.ps1`) | **PASS** | Created `ORD-20261125-85da43` (`is_guest=true`, `customer_id=nil`), verified idempotency, blocked unauthorized lookup (`403`), verified phone/token lookup (`200`), confirmed visibility in Admin `/orders?customer_type=guest`, cancelled order to restore stock. |
| **E2E-02: Live Customer Registration OTP Initiation & Guards** | Live HTTP API + Gmail SMTP | **PASS** | `POST /auth/customer/register/initiate` delivered real OTP email via `smtp.gmail.com:587`; immediate resend returned `429`; invalid OTP (`000000`) returned `400`. |
| **E2E-03: Admin Discount -> Customer Cart -> Checkout -> History** | Go Integration Test (`TestEndToEndAdminDiscountToCustomerCartCheckoutAndHistory`) | **PASS** | Verified against live PostgreSQL in `internal/catalog/service`. |
| **E2E-04: Customer Profile Photo Upload -> Replace -> Remove** | Go Unit/Lifecycle Test (`TestCustomerProfilePhotoLifecycle`) | **PASS** | Verified PNG validation, unique filename generation, old file cleanup after DB update, and removal cleanup. |
| **E2E-05: Browser Storefront -> Cart Drawer -> Guest Checkout UI** | Live Browser (`http://localhost:5173`) | **PASS** | Verified `/`, `/shop`, Cart Drawer, `/checkout` (desktop `1280x800` & mobile `375x812`), `/track-order`, `/login`, `/register` with 0 console errors. |

---

## 2. Not End-to-End Executed in Browser (Covered by Unit/API Checks Only)
- **Live Browser Customer Profile Photo Upload**: Earlier user screenshot showed an error when the *old* backend binary was running; the backend server on `:8081` was restarted with the new binary (`task-9135`) and `customer_photo_test.go` + `disk_test.go` passed, though manual browser re-test by the user is pending.
- **In-App Payment Receipt Upload & Forgot Password**: **NOT IMPLEMENTED** in the codebase.
