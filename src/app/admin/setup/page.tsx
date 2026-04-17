"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";

const MIGRATION_SQL = `-- Wallet / refund system (migrations 010 + 012 combined)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('refund','debit','adjustment','expiry')),
  reason TEXT,
  quote_distribution_id UUID REFERENCES quote_distributions(id) ON DELETE SET NULL,
  source_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  admin_note TEXT,
  expires_at TIMESTAMPTZ,
  refund_method TEXT CHECK (refund_method IN ('wallet','bank')),
  refund_percent NUMERIC(5,2),
  mollie_refund_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wt_company ON wallet_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_wt_expires ON wallet_transactions(expires_at) WHERE expires_at IS NOT NULL AND amount_cents > 0;
CREATE INDEX IF NOT EXISTS idx_wt_method ON wallet_transactions(refund_method) WHERE refund_method IS NOT NULL;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS wallet_balance_cents INTEGER NOT NULL DEFAULT 0;

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "movers_read_own_wallet" ON wallet_transactions;
CREATE POLICY "movers_read_own_wallet" ON wallet_transactions
  FOR SELECT USING (company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid()));

NOTIFY pgrst, 'reload schema';`;

interface SetupState {
  ready: boolean;
  checks: Record<string, boolean>;
  supabaseSqlUrl: string | null;
}

export default function AdminSetup() {
  const [state, setState] = useState<SetupState | null>(null);
  const [loading, setLoading] = useState(true);

  async function check() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/setup");
      if (res.ok) setState(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    check();
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(MIGRATION_SQL);
      toast.success("SQL copié !");
    } catch {
      toast.error("Copie impossible — sélectionnez et copiez manuellement");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Wallet className="h-6 w-6 text-[var(--brand-green)]" />
          Installation / mise à jour base de données
        </h2>
        <p className="text-sm text-muted-foreground">
          Vérifie que le schéma nécessaire au portefeuille et aux remboursements
          est bien en place dans Supabase.
        </p>
      </div>

      {/* Status */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-sm font-semibold">État du schéma</h3>
          <button
            onClick={check}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Vérifier
          </button>
        </div>
        <div className="p-5">
          {!state ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(state.checks).map(([name, ok]) => (
                <div
                  key={name}
                  className={
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-sm " +
                    (ok ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50")
                  }
                >
                  <div className="flex items-center gap-2">
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <code className="font-mono text-xs">{name}</code>
                  </div>
                  <span
                    className={
                      "text-xs font-semibold " +
                      (ok ? "text-green-700" : "text-red-700")
                    }
                  >
                    {ok ? "OK" : "MANQUANT"}
                  </span>
                </div>
              ))}

              {state.ready ? (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                  <p className="font-semibold">✅ Tout est en place.</p>
                  <p className="mt-1 text-xs">
                    Le portefeuille et les remboursements sont opérationnels.
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  <p className="font-semibold">
                    ⚠ Migration requise — appliquez le SQL ci-dessous.
                  </p>
                  <p className="mt-1 text-xs">
                    Sans ça, aucun remboursement ne peut être créé et le
                    portefeuille affiche toujours 0 €.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SQL block */}
      {state && !state.ready && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h3 className="text-sm font-semibold">Migration SQL à exécuter</h3>
            <div className="flex gap-2">
              <button
                onClick={copy}
                className="flex items-center gap-1.5 rounded-md bg-[var(--brand-green)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
              >
                <Copy className="h-3.5 w-3.5" />
                Copier le SQL
              </button>
              {state.supabaseSqlUrl && (
                <a
                  href={state.supabaseSqlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ouvrir Supabase
                </a>
              )}
            </div>
          </div>
          <div className="p-5">
            <ol className="mb-4 space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>1.</strong> Cliquez sur <em>Copier le SQL</em>
              </li>
              <li>
                <strong>2.</strong> Cliquez sur <em>Ouvrir Supabase</em>
              </li>
              <li>
                <strong>3.</strong> Collez dans l&apos;éditeur, cliquez{" "}
                <em>Run</em>, attendez le ✓
              </li>
              <li>
                <strong>4.</strong> Revenez ici et cliquez <em>Vérifier</em>
              </li>
            </ol>
            <pre className="max-h-96 overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-100">
              <code>{MIGRATION_SQL}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
