"use client";

import { useState } from "react";
import { Wallet, ShieldCheck, Info, ChevronDown } from "lucide-react";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  onUpdate: <K extends keyof Settings>(field: K, value: Settings[K]) => void;
}

export default function RefundsTab({ settings, onUpdate }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* ─── Master toggle ───────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Wallet className="h-4 w-4 text-[var(--brand-green)]" />
            Remboursements &amp; portefeuille
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Tous les remboursements passent par{" "}
            <code className="rounded bg-muted px-1">/admin/transactions</code>,
            avec le plafond % appliqué automatiquement.
          </p>
        </div>
        <div className="p-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-gray-50/50 p-4 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.refundsEnabled}
              onChange={(e) => onUpdate("refundsEnabled", e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--brand-green)]"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                Activer le système de remboursement
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Désactivé = aucun bouton « Rembourser » dans l&apos;admin et le
                portefeuille reste masqué côté déménageur.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* ─── Core settings (always visible) ──────────────────────────────── */}
      <div
        className={
          settings.refundsEnabled ? "" : "pointer-events-none opacity-50"
        }
      >
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <ShieldCheck className="h-4 w-4 text-[var(--brand-green)]" />
              Règles principales
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Appliquées à <strong>chaque</strong> remboursement — wallet ou
              carte bancaire.
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  % maximum par transaction
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
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Recommandé : <strong>10 %</strong>. Un lead à 12 € ⇒ max{" "}
                  {settings.refundMaxPercent
                    ? ((parseFloat(settings.refundMaxPercent) * 12) / 100).toFixed(2)
                    : "—"}{" "}
                  € remboursable.
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
                    onChange={(e) =>
                      onUpdate("walletValidityDays", e.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2 pr-16 text-sm outline-none focus:border-[var(--brand-green)]"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    jours
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <strong>365</strong> = 1 an. Passé ce délai, le crédit est
                  ignoré automatiquement — <em>gain net</em> pour l&apos;entreprise.
                </p>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-gray-50/50 p-4 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={settings.refundOncePerTransaction}
                onChange={(e) =>
                  onUpdate("refundOncePerTransaction", e.target.checked)
                }
                className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--brand-green)]"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  Un remboursement maximum par transaction
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Empêche de rembourser deux fois la même transaction (geste
                  commercial + remboursement carte sur le même lead).
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* ─── Advanced safeguards (collapsible) ─────────────────────────── */}
        <div className="mt-4 rounded-xl border bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center justify-between border-b px-5 py-4 text-left transition-colors hover:bg-gray-50"
          >
            <div>
              <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                Garde-fous avancés
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Plafonds mensuels / annuels et cooldown entre remboursements.
                Optionnels — laissez à <code>0</code> pour désactiver.
              </p>
            </div>
            <ChevronDown
              className={
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform " +
                (advancedOpen ? "rotate-180" : "")
              }
            />
          </button>
          {advancedOpen && (
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Plafond mensuel / déménageur
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.refundMaxPerMoverMonthly}
                      onChange={(e) =>
                        onUpdate("refundMaxPerMoverMonthly", e.target.value)
                      }
                      className="w-full rounded-lg border px-3 py-2 pr-8 text-sm outline-none focus:border-[var(--brand-green)]"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      €
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mois civil. <code>0</code> = illimité.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Plafond annuel / déménageur
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.refundMaxPerMoverYearly}
                      onChange={(e) =>
                        onUpdate("refundMaxPerMoverYearly", e.target.value)
                      }
                      className="w-full rounded-lg border px-3 py-2 pr-8 text-sm outline-none focus:border-[var(--brand-green)]"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      €
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Glissant sur 365 jours. <code>0</code> = illimité.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Cooldown entre deux remboursements
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={settings.refundCooldownDays}
                      onChange={(e) =>
                        onUpdate("refundCooldownDays", e.target.value)
                      }
                      className="w-full rounded-lg border px-3 py-2 pr-16 text-sm outline-none focus:border-[var(--brand-green)]"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      jours
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pour un même déménageur. <code>0</code> = pas de cooldown.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── How it works ─────────────────────────────────────────────── */}
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <div className="text-xs text-blue-900">
              <p className="font-semibold">Comment ça marche</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>
                  Sur <code>/admin/transactions</code>, cliquez « Rembourser » sur
                  la ligne concernée.
                </li>
                <li>
                  Par défaut : <strong>crédit portefeuille</strong> (geste commercial).
                  Un email « Vous avez reçu un remboursement » est envoyé au
                  déménageur.
                </li>
                <li>
                  Cas exceptionnel : cochez <em>Remboursement carte</em> pour
                  rembourser via Mollie. Double confirmation requise.
                </li>
                <li>
                  Le plafond % est <strong>toujours</strong> appliqué,
                  impossible à contourner.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
