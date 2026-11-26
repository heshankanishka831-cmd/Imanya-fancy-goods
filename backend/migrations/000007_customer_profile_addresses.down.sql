-- 000007_customer_profile_addresses.down.sql
ALTER TABLE customers DROP COLUMN IF EXISTS res_house_no;
ALTER TABLE customers DROP COLUMN IF EXISTS res_street;
ALTER TABLE customers DROP COLUMN IF EXISTS res_city;
ALTER TABLE customers DROP COLUMN IF EXISTS res_district;
ALTER TABLE customers DROP COLUMN IF EXISTS res_postal_code;
ALTER TABLE customers DROP COLUMN IF EXISTS delivery_same_as_residential;
ALTER TABLE customers DROP COLUMN IF EXISTS del_recipient_name;
ALTER TABLE customers DROP COLUMN IF EXISTS del_phone;
ALTER TABLE customers DROP COLUMN IF EXISTS del_house_no;
ALTER TABLE customers DROP COLUMN IF EXISTS del_street;
ALTER TABLE customers DROP COLUMN IF EXISTS del_city;
ALTER TABLE customers DROP COLUMN IF EXISTS del_district;
ALTER TABLE customers DROP COLUMN IF EXISTS del_postal_code;
