-- ============================================================================
-- 004 — Add lead_purchase to transactions type constraint
-- ============================================================================

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('unlock', 'lead_purchase', 'subscription', 'refund', 'credit'));
