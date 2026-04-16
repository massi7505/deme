-- ============================================================================
-- 002 — Phone verification for leads
-- ============================================================================

ALTER TABLE quote_requests
  ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN phone_verification_code TEXT,
  ADD COLUMN phone_verification_expires TIMESTAMPTZ;
