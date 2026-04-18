-- 016_lead_defect_flag.sql
-- Adds columns to track collective-claim-driven lead defect workflow.
-- Flag is per-lead (quote_request), not per-claim, since multiple claims
-- from different movers target the same underlying lead.

ALTER TABLE quote_requests
  ADD COLUMN defect_status TEXT
    CHECK (defect_status IN ('suspected', 'confirmed_refunded', 'rejected')),
  ADD COLUMN defect_flagged_at TIMESTAMPTZ,
  ADD COLUMN defect_resolved_at TIMESTAMPTZ,
  ADD COLUMN defect_resolved_by TEXT;

CREATE INDEX quote_requests_defect_idx
  ON quote_requests (defect_status)
  WHERE defect_status IS NOT NULL;
