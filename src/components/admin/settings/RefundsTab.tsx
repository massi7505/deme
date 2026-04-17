"use client";

import { Wallet } from "lucide-react";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  onUpdate: <K extends keyof Settings>(field: K, value: Settings[K]) => void;
}

export default function RefundsTab({ settings, onUpdate }: Props) {
  const pct = parseFloat(settings.refundMaxPercent || "30");
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Wallet className="h-4 w-4 text-[var(--brand-green)]" />
            Remboursements
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Pourcentage maximum remboursable par lead. Appliqué à tous les
            remboursements — impossible de dépasser.
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

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Pourcentage de remboursement
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={pct}
                onChange={(e) => onUpdate("refundMaxPercent", e.target.value)}
                className="flex-1 accent-[var(--brand-green)]"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.refundMaxPercent}
                  onChange={(e) => onUpdate("refundMaxPercent", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-8 text-sm font-semibold outline-none focus:border-[var(--brand-green)]"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>Lead 12 € ⇒ max <strong className="text-foreground">{((pct * 12) / 100).toFixed(2)} €</strong></span>
              <span>Lead 18 € ⇒ max <strong className="text-foreground">{((pct * 18) / 100).toFixed(2)} €</strong></span>
              <span>Lead 25 € ⇒ max <strong className="text-foreground">{((pct * 25) / 100).toFixed(2)} €</strong></span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Validité du crédit portefeuille
            </label>
            <div className="relative max-w-xs">
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
              365 = 1 an. Passé ce délai, le crédit expire et n&apos;est plus utilisable.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900">
        <p className="font-semibold">Règles automatiques et inviolables</p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
          <li>
            Par défaut : <strong>crédit portefeuille</strong> (l&apos;argent reste sur la plateforme).
          </li>
          <li>
            Cas rare : remboursement carte bancaire — l&apos;admin doit cocher une case et confirmer.
          </li>
          <li>
            Impossible de rembourser plus de <strong>{pct} %</strong> du lead — même en modifiant l&apos;URL ou le code.
          </li>
          <li>
            Un seul remboursement par transaction. Le bouton est grisé sur les leads déjà remboursés.
          </li>
        </ul>
      </div>
    </div>
  );
}
