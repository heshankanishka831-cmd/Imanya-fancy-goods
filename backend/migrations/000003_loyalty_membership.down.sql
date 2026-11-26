-- 000003_loyalty_membership.down.sql
DELETE FROM casbin_rule WHERE v1 LIKE '/api/v1/membership%' OR v1 = '/api/v1/customer/membership';
DROP TABLE IF EXISTS loyalty_settings;
DROP INDEX IF EXISTS idx_customers_membership_tier;
DROP INDEX IF EXISTS idx_customers_lifetime_spent;
ALTER TABLE customers DROP COLUMN IF EXISTS membership_tier;
ALTER TABLE customers DROP COLUMN IF EXISTS lifetime_spent;
