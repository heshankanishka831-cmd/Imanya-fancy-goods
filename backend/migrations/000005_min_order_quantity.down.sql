-- 000005_min_order_quantity.down.sql
ALTER TABLE products DROP COLUMN IF EXISTS min_order_quantity;
