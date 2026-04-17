-- ============================================================================
-- Mover wallet (refund credits)
-- Migration: 010_wallet.sql
-- ============================================================================

-- Ledger: every credit and debit lives here. Balance is derived, never trusted.
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    amount_cents          INTEGER NOT NULL,  -- positive = credit, negative = debit
    type                  TEXT NOT NULL CHECK (type IN ('refund', 'debit', 'adjustment', 'expiry')),
    reason                TEXT,
    quote_distribution_id UUID REFERENCES quote_distributions(id) ON DELETE SET NULL,
    source_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    admin_note            TEXT,
    expires_at            TIMESTAMPTZ,       -- for credits only; debits inherit from consumed credit
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_company_id ON wallet_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_expires_at ON wallet_transactions(expires_at)
    WHERE expires_at IS NOT NULL AND amount_cents > 0;

-- Cached balance for quick dashboard reads. Source of truth is the ledger.
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS wallet_balance_cents INTEGER NOT NULL DEFAULT 0;

-- RLS: movers can read their own wallet only.
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movers_read_own_wallet" ON wallet_transactions;
CREATE POLICY "movers_read_own_wallet" ON wallet_transactions
    FOR SELECT USING (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    );
