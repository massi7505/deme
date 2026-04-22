-- 024_quote_requests_status_check_update.sql
-- Allow 'review_pending' and 'rejected' as lead statuses so the upstream
-- fraud-detection layer can park suspicious submissions before distribution
-- and admins can reject them outright.
--
-- The original CHECK constraint (from 001_initial_schema.sql line 139) only
-- allowed: new, active, blocked, completed, archived.

ALTER TABLE quote_requests DROP CONSTRAINT IF EXISTS quote_requests_status_check;

ALTER TABLE quote_requests
  ADD CONSTRAINT quote_requests_status_check
  CHECK (status IN ('new', 'active', 'blocked', 'completed', 'archived', 'review_pending', 'rejected'));
