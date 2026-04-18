-- 014_company_name_change_request.sql
-- Adds pending_name fields to support the mover-side name-change request
-- workflow with admin validation.

ALTER TABLE companies
  ADD COLUMN pending_name TEXT,
  ADD COLUMN pending_name_requested_at TIMESTAMPTZ;

CREATE INDEX companies_pending_name_idx
  ON companies (pending_name_requested_at)
  WHERE pending_name IS NOT NULL;
