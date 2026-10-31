ALTER TABLE otp_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE otp_codes ADD COLUMN request_ip_hash TEXT;
CREATE INDEX IF NOT EXISTS otp_phone_created ON otp_codes(phone,created_at);
CREATE INDEX IF NOT EXISTS otp_ip_created ON otp_codes(request_ip_hash,created_at);
