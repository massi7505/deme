-- 025_wallet_expiry_warnings.sql
-- Track per-threshold expiry warnings so the daily cron never double-sends.

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS warned_at_30d timestamptz,
  ADD COLUMN IF NOT EXISTS warned_at_7d  timestamptz;

-- Partial index: the warning worker only scans positive wallet-method refunds
-- with an expiry. That's a small slice of wallet_transactions, so a narrow
-- index keeps the cron fast without affecting the hot-path balance query.
CREATE INDEX IF NOT EXISTS idx_wallet_expiry_warning
  ON wallet_transactions (expires_at)
  WHERE amount_cents > 0
    AND type = 'refund'
    AND refund_method = 'wallet'
    AND expires_at IS NOT NULL;
