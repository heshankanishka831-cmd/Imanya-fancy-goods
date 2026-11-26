-- 000006_product_discounts.down.sql
DROP INDEX IF EXISTS idx_products_discount;
ALTER TABLE order_items DROP COLUMN IF EXISTS discount_amount;
ALTER TABLE order_items DROP COLUMN IF EXISTS discount_percent;
ALTER TABLE order_items DROP COLUMN IF EXISTS original_price;
ALTER TABLE products DROP COLUMN IF EXISTS discount_end_date;
ALTER TABLE products DROP COLUMN IF EXISTS discount_start_date;
ALTER TABLE products DROP COLUMN IF EXISTS discount_percent;
ALTER TABLE products DROP COLUMN IF EXISTS is_discount_enabled;
