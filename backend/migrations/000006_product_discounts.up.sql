-- 000006_product_discounts.up.sql
-- Admin-Controlled Product Discount Management

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_discount_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percent >= 0 AND discount_percent < 100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_start_date TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_end_date TIMESTAMPTZ;

-- Store historical discount pricing on order items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS original_price NUMERIC(12, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_discount ON products(is_discount_enabled, discount_start_date, discount_end_date);
