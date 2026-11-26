DROP INDEX IF EXISTS idx_orders_idempotency_key;
DROP INDEX IF EXISTS idx_orders_guest_phone;
DROP INDEX IF EXISTS idx_orders_is_guest;

ALTER TABLE orders DROP COLUMN IF EXISTS whatsapp_notification_error;
ALTER TABLE orders DROP COLUMN IF EXISTS whatsapp_notification_status;
ALTER TABLE orders DROP COLUMN IF EXISTS idempotency_key;
ALTER TABLE orders DROP COLUMN IF EXISTS guest_access_token;
ALTER TABLE orders DROP COLUMN IF EXISTS guest_postal_code;
ALTER TABLE orders DROP COLUMN IF EXISTS guest_province;
ALTER TABLE orders DROP COLUMN IF EXISTS guest_city;
ALTER TABLE orders DROP COLUMN IF EXISTS guest_email;
ALTER TABLE orders DROP COLUMN IF EXISTS guest_phone;
ALTER TABLE orders DROP COLUMN IF EXISTS guest_name;
ALTER TABLE orders DROP COLUMN IF EXISTS guest_last_name;
ALTER TABLE orders DROP COLUMN IF EXISTS guest_first_name;
ALTER TABLE orders DROP COLUMN IF EXISTS is_guest;
