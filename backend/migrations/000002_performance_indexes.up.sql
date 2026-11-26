-- 000002_performance_indexes.up.sql
-- High-performance composite indexes for customer catalog browsing, order history, and warehouse reporting

-- 1. Accelerate storefront catalog listing (is_active filtered, reverse chronologically ordered)
CREATE INDEX IF NOT EXISTS idx_products_active_created ON products(is_active, created_at DESC);

-- 2. Accelerate category-specific product queries
CREATE INDEX IF NOT EXISTS idx_products_cat_active_created ON products(category_id, is_active, created_at DESC);

-- 3. Accelerate customer dashboard order history lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC);

-- 4. Accelerate admin order status filtering with date sorting
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- 5. Accelerate inventory movement history by product
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod_created ON stock_movements(product_id, created_at DESC);

-- 6. Accelerate customer VIP tier ranking and lifetime spend lookups
CREATE INDEX IF NOT EXISTS idx_customers_active_spent ON customers(is_active, lifetime_spent DESC);

-- 7. Accelerate cart item lookups by product ID
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
