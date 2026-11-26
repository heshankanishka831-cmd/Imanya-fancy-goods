-- 000005_min_order_quantity.up.sql
-- Admin-Controlled Minimum Order Quantity per Product
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER NOT NULL DEFAULT 1;

-- Backfill existing products to have at least min_order_quantity = 1
UPDATE products SET min_order_quantity = 1 WHERE min_order_quantity IS NULL OR min_order_quantity < 1;
