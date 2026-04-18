-- ============================================================================
-- Partial wallet payment support on transactions
-- Migration: 013_transaction_wallet_debit.sql
-- ============================================================================

-- When a mover pays a lead partly with wallet + partly with card:
--   amount_cents       = full lead price (for accounting + invoicing)
--   wallet_debit_cents = portion covered by wallet credit
-- Card charge = amount_cents - wallet_debit_cents.
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS wallet_debit_cents INTEGER NOT NULL DEFAULT 0;
