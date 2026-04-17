-- 006_rate_limit_events.sql
-- Lightweight IP-based rate limiting for public verification endpoints.
-- Every allowed request inserts a row; the helper counts rows within
-- the recent time window. Old rows are purged by an app-level cleanup
-- (run inside the rate-limit helper on each call).

CREATE TABLE rate_limit_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         TEXT NOT NULL,
  endpoint   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for the hot path: (ip, endpoint, time).
CREATE INDEX idx_rate_limit_lookup
  ON rate_limit_events (ip, endpoint, created_at DESC);

-- Secondary index for time-based cleanup.
CREATE INDEX idx_rate_limit_created_at
  ON rate_limit_events (created_at);
