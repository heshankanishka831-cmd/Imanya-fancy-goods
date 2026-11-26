-- 000003_loyalty_membership.up.sql
-- Loyalty & Membership Ranking System for Imanya Fancy Goods

-- 1. Loyalty Tier Threshold Settings Table
CREATE TABLE IF NOT EXISTS loyalty_settings (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(32) NOT NULL UNIQUE, -- 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'
    min_spend NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (min_spend >= 0),
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default tier spending thresholds:
-- Bronze: default 0
-- Silver: 100,000 LKR
-- Gold: 500,000 LKR (Configurable)
-- Platinum: 1,000,000 LKR
INSERT INTO loyalty_settings (tier_name, min_spend, description, sort_order) VALUES
('BRONZE', 0.00, 'Entry tier for registered customers', 1),
('SILVER', 100000.00, 'Silver Partner - Lifetime purchases of Rs. 100,000+', 2),
('GOLD', 500000.00, 'Gold Partner - High volume commercial buyer', 3),
('PLATINUM', 1000000.00, 'Platinum VIP Partner - Elite customer tier with priority fulfillment', 4)
ON CONFLICT (tier_name) DO NOTHING;

-- 2. Add Membership Fields to Customers Table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(32) NOT NULL DEFAULT 'BRONZE';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_spent NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (lifetime_spent >= 0);

CREATE INDEX IF NOT EXISTS idx_customers_membership_tier ON customers(membership_tier);
CREATE INDEX IF NOT EXISTS idx_customers_lifetime_spent ON customers(lifetime_spent);

-- 3. Backfill existing customers based on eligible orders
UPDATE customers c
SET lifetime_spent = COALESCE((
    SELECT SUM(o.total_amount)
    FROM orders o
    WHERE o.customer_id = c.id
      AND o.status IN ('CONFIRMED', 'PROCESSING', 'COMPLETED', 'DELIVERED')
), 0.00);

UPDATE customers
SET membership_tier = CASE
    WHEN lifetime_spent >= 1000000 THEN 'PLATINUM'
    WHEN lifetime_spent >= 500000 THEN 'GOLD'
    WHEN lifetime_spent >= 100000 THEN 'SILVER'
    ELSE 'BRONZE'
END;

-- 4. Casbin Policy Rules for Membership
INSERT INTO casbin_rule (ptype, v0, v1, v2) VALUES
('p', 'Super Administrator', '/api/v1/membership*', '*'),
('p', 'Order Manager', '/api/v1/membership*', '*'),
('p', 'Inventory Manager', '/api/v1/membership*', 'GET'),
('p', 'Customer', '/api/v1/customer/membership', 'GET')
ON CONFLICT DO NOTHING;
