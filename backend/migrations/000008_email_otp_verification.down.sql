-- 000008_email_otp_verification.down.sql
DROP INDEX IF EXISTS idx_email_otp_expires_at;
DROP INDEX IF EXISTS idx_email_otp_email_purpose;
DROP TABLE IF EXISTS email_otp_verifications;
DROP INDEX IF EXISTS idx_users_email_lower;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
