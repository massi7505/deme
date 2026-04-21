-- 022_lead_fraud_detection.sql
-- Store fraud score + reasons on every lead so admin can review suspicious
-- submissions before they reach movers. Also add review audit fields.

ALTER TABLE quote_requests
  ADD COLUMN fraud_score    INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN fraud_reasons  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN reviewed_at    TIMESTAMPTZ,
  ADD COLUMN reviewed_by    TEXT;

-- Hot path: admin sidebar counts + admin leads filter.
CREATE INDEX idx_quote_requests_review_pending
  ON quote_requests (status)
  WHERE status = 'review_pending';
