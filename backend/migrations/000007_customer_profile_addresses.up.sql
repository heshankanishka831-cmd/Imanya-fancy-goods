-- 000007_customer_profile_addresses.up.sql
-- Structured Residential & Delivery Address fields for Customer Profile management

ALTER TABLE customers ADD COLUMN IF NOT EXISTS res_house_no VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS res_street VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS res_city VARCHAR(120);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS res_district VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS res_postal_code VARCHAR(32);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_same_as_residential BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS del_recipient_name VARCHAR(150);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS del_phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS del_house_no VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS del_street VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS del_city VARCHAR(120);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS del_district VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS del_postal_code VARCHAR(32);

-- Backfill delivery_same_as_residential accurately for existing customers
UPDATE customers
SET delivery_same_as_residential = CASE
    WHEN COALESCE(TRIM(delivery_address), '') = '' THEN TRUE
    WHEN COALESCE(TRIM(residential_address), '') = '' THEN TRUE
    WHEN TRIM(delivery_address) = TRIM(residential_address) THEN TRUE
    ELSE FALSE
END;
