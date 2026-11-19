-- 000002_seed_initial_data.up.sql

-- 1. Initial Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'Super Administrator', 'Full system access and operational management'),
(2, 'Inventory Manager', 'Product, procurement, supplier, and inventory management'),
(3, 'Order Manager', 'Customer order processing and customer management'),
(4, 'Customer', 'Public storefront browsing, cart, and self-order tracking')
ON CONFLICT (id) DO NOTHING;

SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- 2. Super Administrator User (Password: Admin@123456)
INSERT INTO users (id, role_id, username, email, password_hash, first_name, last_name, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    1,
    'superadmin',
    'admin@wholesale.local',
    '$2a$10$m8P9pwu8VlUR3o.SJB/ur.UmmZ/XsGkXtC5Q6jp.kcZfB5EDdOlWW',
    'Super',
    'Admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- 3. Casbin Policy Rules
-- Format: ptype, v0 (role), v1 (resource pattern), v2 (method)
INSERT INTO casbin_rule (ptype, v0, v1, v2) VALUES
-- Super Administrator has unrestricted access
('p', 'Super Administrator', '/api/v1/*', '*'),

-- Inventory Manager permissions
('p', 'Inventory Manager', '/api/v1/products*', '*'),
('p', 'Inventory Manager', '/api/v1/categories*', '*'),
('p', 'Inventory Manager', '/api/v1/suppliers*', '*'),
('p', 'Inventory Manager', '/api/v1/purchase-orders*', '*'),
('p', 'Inventory Manager', '/api/v1/goods-receipts*', '*'),
('p', 'Inventory Manager', '/api/v1/inventory*', '*'),
('p', 'Inventory Manager', '/api/v1/stock-movements*', '*'),
('p', 'Inventory Manager', '/api/v1/reports*', 'GET'),

-- Order Manager permissions
('p', 'Order Manager', '/api/v1/orders*', '*'),
('p', 'Order Manager', '/api/v1/customers*', '*'),
('p', 'Order Manager', '/api/v1/reports*', 'GET'),

-- Customer permissions
('p', 'Customer', '/api/v1/customer/*', '*'),
('p', 'Customer', '/api/v1/public/*', 'GET')
ON CONFLICT DO NOTHING;

-- 4. Initial Sample Categories
INSERT INTO categories (id, name, slug, description, is_active) VALUES
(1, 'Beverages & Soft Drinks', 'beverages-soft-drinks', 'Imported packaged beverages, juices, and soft drinks', TRUE),
(2, 'Confectionery & Snacks', 'confectionery-snacks', 'Wholesale chocolates, biscuits, snacks, and sweets', TRUE),
(3, 'Dry Foods & Grains', 'dry-foods-grains', 'Rice, pulses, pasta, flour, and staples', TRUE),
(4, 'Personal Care & Hygiene', 'personal-care-hygiene', 'Soap, shampoos, sanitizers, and wholesale toiletries', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- 5. Initial Sample Supplier
INSERT INTO suppliers (id, name, contact_person, email, phone, address, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Global Beverage Importers Ltd', 'Johnathan Davis', 'orders@globalbeverage.example', '+1234567890', 'Port Distribution Center, Warehouse 4B', TRUE),
('22222222-2222-2222-2222-222222222222', 'Apex Wholesale Goods Supply', 'Maria Rodriguez', 'maria@apexsupply.example', '+1987654321', 'Industrial Zone Block 12, Terminal Rd', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. Initial Sample Products & Stock
INSERT INTO products (id, category_id, sku, name, slug, description, unit_of_measure, selling_price, cost_price, is_active) VALUES
('33333333-3333-3333-3333-333333333301', 1, 'BEV-ORG-500', 'Organic Sparkling Orange Juice 500ml', 'organic-sparkling-orange-juice-500ml', 'Imported sparkling orange juice, 24 units per carton', 'CARTON', 48.00, 32.50, TRUE),
('33333333-3333-3333-3333-333333333302', 2, 'SNK-CHOC-BAR', 'Belgian Milk Chocolate Bars 100g', 'belgian-milk-chocolate-bars-100g', 'Premium Belgian chocolate, 50 bars wholesale box', 'BOX', 75.00, 52.00, TRUE),
('33333333-3333-3333-3333-333333333303', 3, 'DRY-BASM-10K', 'Premium Aged Basmati Rice 10kg', 'premium-aged-basmati-rice-10kg', 'Aged extra-long grain basmati rice sack', 'SACK', 28.50, 19.80, TRUE),
('33333333-3333-3333-3333-333333333304', 4, 'HYG-SOAP-CS', 'Antibacterial Hand Soap 250ml', 'antibacterial-hand-soap-250ml', 'Wholesale case of 48 bottles', 'CASE', 62.00, 41.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Stock Balances
INSERT INTO product_stock (product_id, current_stock, allocated_stock, low_stock_threshold) VALUES
('33333333-3333-3333-3333-333333333301', 120, 0, 15),
('33333333-3333-3333-3333-333333333302', 85, 0, 10),
('33333333-3333-3333-3333-333333333303', 200, 0, 25),
('33333333-3333-3333-3333-333333333304', 60, 0, 10)
ON CONFLICT (product_id) DO NOTHING;

-- Initial Stock Ledger Entries
INSERT INTO stock_movements (product_id, user_id, movement_type, quantity_changed, quantity_before, quantity_after, reference_id, notes) VALUES
('33333333-3333-3333-3333-333333333301', '00000000-0000-0000-0000-000000000001', 'RECEIVING', 120, 0, 120, 'INITIAL_SEED', 'Initial warehouse stock load'),
('33333333-3333-3333-3333-333333333302', '00000000-0000-0000-0000-000000000001', 'RECEIVING', 85, 0, 85, 'INITIAL_SEED', 'Initial warehouse stock load'),
('33333333-3333-3333-3333-333333333303', '00000000-0000-0000-0000-000000000001', 'RECEIVING', 200, 0, 200, 'INITIAL_SEED', 'Initial warehouse stock load'),
('33333333-3333-3333-3333-333333333304', '00000000-0000-0000-0000-000000000001', 'RECEIVING', 60, 0, 60, 'INITIAL_SEED', 'Initial warehouse stock load')
ON CONFLICT DO NOTHING;
