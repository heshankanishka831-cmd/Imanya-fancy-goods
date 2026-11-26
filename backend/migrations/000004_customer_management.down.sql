-- 000004_customer_management.down.sql
ALTER TABLE customers DROP COLUMN IF EXISTS first_name;
ALTER TABLE customers DROP COLUMN IF EXISTS last_name;
ALTER TABLE customers DROP COLUMN IF EXISTS residential_address;
