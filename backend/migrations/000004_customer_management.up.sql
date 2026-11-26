-- 000004_customer_management.up.sql
-- Customer Registration & Admin Customer Management Enhancements

ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS residential_address TEXT;

-- Backfill first_name, last_name, residential_address from users & delivery_address
UPDATE customers c
SET 
    first_name = COALESCE(u.first_name, split_part(c.name, ' ', 1)),
    last_name = COALESCE(u.last_name, SUBSTRING(c.name FROM LENGTH(split_part(c.name, ' ', 1)) + 2)),
    residential_address = COALESCE(c.delivery_address, '')
FROM users u
WHERE c.user_id = u.id;

UPDATE customers
SET 
    first_name = split_part(name, ' ', 1),
    last_name = SUBSTRING(name FROM LENGTH(split_part(name, ' ', 1)) + 2),
    residential_address = COALESCE(delivery_address, '')
WHERE first_name IS NULL OR first_name = '';

-- Ensure index on customer phone, email, and name for fast search
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Casbin RBAC for Admin Customer Management
INSERT INTO casbin_rule (ptype, v0, v1, v2) VALUES
('p', 'Super Administrator', '/api/v1/customers*', '*'),
('p', 'Order Manager', '/api/v1/customers*', '*'),
('p', 'Inventory Manager', '/api/v1/customers*', 'GET')
ON CONFLICT DO NOTHING;
