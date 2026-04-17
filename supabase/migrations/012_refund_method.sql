-- ============================================================================
-- Unified refund tracking: wallet vs bank
-- Migration: 012_refund_method.sql
-- ============================================================================

-- Every refund (wallet credit OR bank refund via Mollie) is now stored in
-- wallet_transactions with a `refund_method`. Bank refunds are tracked for
-- accounting/audit but ignored in the wallet balance calculation.
ALTER TABLE wallet_transactions
    ADD COLUMN IF NOT EXISTS refund_method TEXT
    CHECK (refund_method IN ('wallet', 'bank'));

-- Existing rows predate the column: all previous refunds were wallet credits.
UPDATE wallet_transactions
SET refund_method = 'wallet'
WHERE type = 'refund' AND refund_method IS NULL;

-- Percent of the source transaction this refund represents (0-100).
-- Null for manual adjustments with no source.
ALTER TABLE wallet_transactions
    ADD COLUMN IF NOT EXISTS refund_percent NUMERIC(5,2);

-- Bank refunds need the Mollie refund ID for reconciliation.
ALTER TABLE wallet_transactions
    ADD COLUMN IF NOT EXISTS mollie_refund_id TEXT;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_refund_method
    ON wallet_transactions(refund_method)
    WHERE refund_method IS NOT NULL;
