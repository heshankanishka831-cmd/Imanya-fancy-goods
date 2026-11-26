-- 000008_email_otp_verification.up.sql
-- Email-as-Username & Cryptographic Email OTP Verification Support

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
        -- Mark pre-existing registered accounts as verified so existing admins and customers stay functional
        UPDATE users SET email_verified = TRUE;
    END IF;
END $$;

-- Enforce case-insensitive email uniqueness for login & registration
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- Unified OTP Verification Table for Registration & Verified Email Updates
CREATE TABLE IF NOT EXISTS email_otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose VARCHAR(32) NOT NULL, -- 'REGISTER' or 'CHANGE_EMAIL'
    email VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    payload_json JSONB,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    resend_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    consumed_at TIMESTAMPTZ,
    request_ip VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_email_purpose ON email_otp_verifications (LOWER(email), purpose);
CREATE INDEX IF NOT EXISTS idx_email_otp_expires_at ON email_otp_verifications (expires_at);
