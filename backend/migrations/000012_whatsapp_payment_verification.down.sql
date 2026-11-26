DROP TABLE IF EXISTS order_payment_history;
DROP INDEX IF EXISTS idx_orders_payment_status;

ALTER TABLE orders DROP COLUMN IF EXISTS payment_verified_at;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_verified_by;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_notes;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_method;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;
