"use client";

import { Wallet } from "lucide-react";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  onUpdate: <K extends keyof Settings>(field: K, value: Settings[K]) => void;
}

export default function RefundsTab({ settings, onUpdate }: Props) {
  const maxPct = parseFloat(settings.refundMaxPercent || "10");
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Wallet className="h-4 w-4 text-[var(--brand-green)]" />
            Remboursements
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Rembourser manuellement un lead depuis <code className="rounded bg-muted px-1">/admin/transactions</code> — wallet (standard) ou carte (rare).
          </p>
        </div>
        <div className="space-y-5 p-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-gray-50/50 p-4 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.refundsEnabled}
              onChange={(e) => onUpdate("refundsEnabled", e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--brand-green)]"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">Activer les remboursements</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Désactivé = aucun bouton « Rembourser » dans l&apos;admin.
              </p>
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                % maximum par lead
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.refundMaxPercent}
                  onChange={(e) => onUpdate("refundMaxPercent", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none focus:border-[var(--brand-green)]"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Un lead à 12 € ⇒ max{" "}
                <strong>{((maxPct * 12) / 100).toFixed(2)} €</strong> remboursable.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Validité du crédit wallet
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  step="1"
                  value={settings.walletValidityDays}
                  onChange={(e) => onUpdate("walletValidityDays", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-16 text-sm outline-none focus:border-[var(--brand-green)]"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">jours</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Passé ce délai le crédit expire sans être utilisé — gain net.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
