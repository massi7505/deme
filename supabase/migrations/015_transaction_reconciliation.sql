-- 015_transaction_reconciliation.sql
-- Tracks when a transaction was last reconciled against its upstream
-- Mollie payment. Used by the periodic reconciliation cron to avoid
-- hammering Mollie on the same txn twice in quick succession.

ALTER TABLE transactions
  ADD COLUMN reconciled_at TIMESTAMPTZ;

CREATE INDEX transactions_pending_reconcile_idx
  ON transactions (created_at)
  WHERE status = 'pending' AND mollie_payment_id IS NOT NULL;
