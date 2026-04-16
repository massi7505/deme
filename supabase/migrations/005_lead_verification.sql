-- 005_lead_verification.sql
-- Gate quote distribution on client-controlled email/phone verification.

ALTER TABLE quote_requests
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN email_verification_code TEXT,
  ADD COLUMN email_verification_expires TIMESTAMPTZ,
  ADD COLUMN email_verification_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN email_verification_last_sent_at TIMESTAMPTZ,
  ADD COLUMN phone_verification_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN phone_verification_last_sent_at TIMESTAMPTZ,
  ADD COLUMN distributed_at TIMESTAMPTZ,
  -- Persist the submitted coordinates so distributeLead (called later
  -- from verify routes) can still do radius matching. Before this
  -- migration, /api/quotes only read body.fromLat/fromLng in-memory.
  ADD COLUMN from_lat NUMERIC,
  ADD COLUMN from_lng NUMERIC;

-- Backfill legacy rows as already distributed so movers keep seeing
-- pre-feature leads exactly like before.
UPDATE quote_requests SET distributed_at = created_at WHERE distributed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quote_requests_distributed_at
  ON quote_requests (distributed_at)
  WHERE distributed_at IS NULL;
