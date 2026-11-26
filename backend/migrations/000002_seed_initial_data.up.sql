-- 000002_seed_initial_data.up.sql
-- Production baseline seeds: Essential system roles, Super Administrator, and Casbin RBAC policies
-- (No dummy / demo products, categories, or suppliers; ready for custom user input)

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
    'admin@imanya.local',
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
