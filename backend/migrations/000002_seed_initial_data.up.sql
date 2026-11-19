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

-- 4. Initial Sample Categories (Fancy Goods & Accessories)
INSERT INTO categories (id, name, slug, description, is_active) VALUES
(1, 'Fashion Jewelry & Accessories', 'fashion-jewelry-accessories', 'Korean earrings, necklaces, bangles, rings, and wholesale jewelry', TRUE),
(2, 'Hair Accessories & Clips', 'hair-accessories-clips', 'Claw clips, scrunchies, headbands, hairpins, and styling accessories', TRUE),
(3, 'Cosmetics & Beauty Tools', 'cosmetics-beauty-tools', 'Makeup mirrors, brush sets, cosmetic organizers, and beauty accessories', TRUE),
(4, 'Watches, Bags & Wallets', 'watches-bags-wallets', 'Fashion ladies handbags, slim coin purses, and wholesale quartz watches', TRUE),
(5, 'Gifts, Toys & Novelties', 'gifts-toys-novelties', 'Plush keychains, decorative figurines, fancy gift items, and novelties', TRUE),
(6, 'Stationery & School Fancy Goods', 'stationery-school-fancy-goods', 'Fancy gel pen sets, pencil cases, aesthetic notebooks, and cute stationery', TRUE)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- 5. Initial Sample Suppliers (Direct Import Wholesale)
INSERT INTO suppliers (id, name, contact_person, email, phone, address, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Yiwu Direct Global Import Co.', 'Chen Wei', 'chen@yiwuglobal.example', '+8657985112233', 'Yiwu International Trade Mart, District 1, Zhejiang, China', TRUE),
('22222222-2222-2222-2222-222222222222', 'Guangzhou Fashion & Accessories Wholesale', 'Lin Zhang', 'export@gzfashion.example', '+862088991122', 'Baiyun World Leather Trading Center, Guangzhou, China', TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    is_active = EXCLUDED.is_active;

-- 6. Initial Sample Products & Stock (Fancy Goods)
INSERT INTO products (id, category_id, sku, name, slug, description, unit_of_measure, selling_price, cost_price, is_active) VALUES
('33333333-3333-3333-3333-333333333301', 1, 'JWL-GLD-SET', 'Stainless Steel Gold Plated Pendant Necklace Set', 'stainless-steel-gold-plated-pendant-necklace-set', 'Anti-tarnish 18K gold plated minimalist necklace collection. Pack of 12 assorted designs.', 'DOZEN', 4200.00, 2650.00, TRUE),
('33333333-3333-3333-3333-333333333302', 2, 'HCL-CRY-012', 'Crystal Korean Butterfly Hair Claw Clips (12 Pcs)', 'crystal-korean-butterfly-hair-claw-clips-12-pcs', 'Premium acrylic & crystal claw clips, durable spring mechanism, wholesale card of 12 pcs.', 'PACK', 1850.00, 1100.00, TRUE),
('33333333-3333-3333-3333-333333333303', 3, 'BTY-MIR-LED', 'Portable Folding LED Touch Travel Makeup Mirror', 'portable-folding-led-touch-travel-makeup-mirror', 'USB rechargeable dimmable LED travel vanity mirror with protective cover.', 'PIECE', 950.00, 580.00, TRUE),
('33333333-3333-3333-3333-333333333304', 4, 'BAG-SLM-W01', 'Soft PU Leather Crossbody Women Handbag', 'soft-pu-leather-crossbody-women-handbag', 'Trendy textured PU leather shoulder bag with gold chain strap, assorted pastel colors.', 'PIECE', 2450.00, 1550.00, TRUE),
('33333333-3333-3333-3333-333333333305', 5, 'GFT-KCH-012', 'Cartoon Plush Animal Bag Charm Keychains (12 Pcs)', 'cartoon-plush-animal-bag-charm-keychains-12-pcs', 'Soft plush animal keychains with alloy clasps, ideal for backpacks and gifts. 12 pcs card.', 'PACK', 1450.00, 850.00, TRUE),
('33333333-3333-3333-3333-333333333306', 6, 'STN-GEL-SET', 'Morandi Aesthetic Quick-Dry Gel Pens (Set of 24)', 'morandi-aesthetic-quick-dry-gel-pens-set-of-24', '0.5mm black ink smooth writing vintage color barrel pen sets in display gift box.', 'BOX', 890.00, 520.00, TRUE)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    sku = EXCLUDED.sku,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    unit_of_measure = EXCLUDED.unit_of_measure,
    selling_price = EXCLUDED.selling_price,
    cost_price = EXCLUDED.cost_price,
    is_active = EXCLUDED.is_active;

-- Stock Balances
INSERT INTO product_stock (product_id, current_stock, allocated_stock, low_stock_threshold) VALUES
('33333333-3333-3333-3333-333333333301', 85, 0, 10),
('33333333-3333-3333-3333-333333333302', 160, 0, 20),
('33333333-3333-3333-3333-333333333303', 120, 0, 15),
('33333333-3333-3333-3333-333333333304', 65, 0, 10),
('33333333-3333-3333-3333-333333333305', 210, 0, 25),
('33333333-3333-3333-3333-333333333306', 175, 0, 20)
ON CONFLICT (product_id) DO UPDATE SET
    current_stock = EXCLUDED.current_stock,
    allocated_stock = EXCLUDED.allocated_stock,
    low_stock_threshold = EXCLUDED.low_stock_threshold;

-- Initial Stock Ledger Entries
INSERT INTO stock_movements (product_id, user_id, movement_type, quantity_changed, quantity_before, quantity_after, reference_id, notes) VALUES
('33333333-3333-3333-3333-333333333301', '00000000-0000-0000-0000-000000000001', 'RECEIVING', 85, 0, 85, 'INITIAL_SEED', 'Initial warehouse fancy goods stock load'),
('33333333-3333-3333-3333-333333333302', '00000000-0000-0000-0000-000000000001', 'RECEIVING', 160, 0, 160, 'INITIAL_SEED', 'Initial warehouse fancy goods stock load'),
('33333333-3333-3333-3333-333333333303', '00000000-0000-0000-0000-000000000001', 'RECEIVING', 120, 0, 120, 'INITIAL_SEED', 'Initial warehouse fancy goods stock load'),
('33333333-3333-3333-3333-333333333304', '00000000-0000-0000-0000-000000000001', 'RECEIVING', 65, 0, 65, 'INITIAL_SEED', 'Initial warehouse fancy goods stock load'),
('33333333-3333-3333-3333-333333333305', '00000000-0000-0000-0000-000000000001', 'RECEIVING', 210, 0, 210, 'INITIAL_SEED', 'Initial warehouse fancy goods stock load'),
('33333333-3333-3333-3333-333333333306', '00000000-0000-0000-0000-000000000001', 'RECEIVING', 175, 0, 175, 'INITIAL_SEED', 'Initial warehouse fancy goods stock load')
ON CONFLICT DO NOTHING;
