"use client";

import { Wallet, Info } from "lucide-react";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  onUpdate: <K extends keyof Settings>(field: K, value: Settings[K]) => void;
}

export default function RefundsTab({ settings, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Wallet className="h-4 w-4 text-[var(--brand-green)]" />
            Remboursements &amp; portefeuille
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Gérez les règles de remboursement et le portefeuille (wallet) des déménageurs.
          </p>
        </div>
        <div className="space-y-4 p-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-gray-50/50 p-4 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.refundsEnabled}
              onChange={(e) => onUpdate("refundsEnabled", e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--brand-green)]"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">Activer le système de remboursement</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Si désactivé, les admins ne peuvent pas créer de remboursement et le portefeuille est masqué côté déménageur.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Mode & parameters */}
      <div className={settings.refundsEnabled ? "" : "pointer-events-none opacity-50"}>
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="font-display text-base font-semibold">Mode par défaut</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Choisissez le mode appliqué par défaut quand un admin lance un remboursement depuis une réclamation ou une transaction.
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-all ${
                  settings.refundMode === "wallet"
                    ? "border-[var(--brand-green)] bg-green-50/60"
                    : "hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="refundMode"
                    checked={settings.refundMode === "wallet"}
                    onChange={() => onUpdate("refundMode", "wallet")}
                    className="accent-[var(--brand-green)]"
                  />
                  <span className="text-sm font-semibold">Crédit portefeuille</span>
                </div>
                <p className="pl-6 text-xs text-muted-foreground">
                  Le montant est crédité sur le portefeuille du déménageur et utilisé automatiquement sur ses prochains achats.
                </p>
              </label>

              <label
                className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-all ${
                  settings.refundMode === "percentage"
                    ? "border-[var(--brand-green)] bg-green-50/60"
                    : "hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="refundMode"
                    checked={settings.refundMode === "percentage"}
                    onChange={() => onUpdate("refundMode", "percentage")}
                    className="accent-[var(--brand-green)]"
                  />
                  <span className="text-sm font-semibold">Remboursement pourcentage</span>
                </div>
                <p className="pl-6 text-xs text-muted-foreground">
                  Rembourse un pourcentage de la transaction originale (ex. 30 % du lead) sur la carte du déménageur.
                </p>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Pourcentage par défaut (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.refundDefaultPercent}
                  onChange={(e) => onUpdate("refundDefaultPercent", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Pré-rempli dans le formulaire de remboursement côté admin.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Validité du crédit portefeuille (jours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  step="1"
                  value={settings.walletValidityDays}
                  onChange={(e) => onUpdate("walletValidityDays", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  365 jours = 1 an. Passé ce délai, le crédit est expiré automatiquement.
                </p>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-gray-50/50 p-4 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={settings.refundAllowPartial}
                onChange={(e) => onUpdate("refundAllowPartial", e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--brand-green)]"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">Autoriser les remboursements partiels</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Si coché, l&apos;admin peut saisir un montant libre (ou un pourcentage) plutôt que le remboursement complet.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Guardrails — protect the company from over-refunding */}
        <div className="mt-4 rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="font-display text-base font-semibold">Limites de sécurité</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Empêchent tout remboursement excessif, même par erreur. Bloquent l&apos;admin au moment du crédit.
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">% max par remboursement</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.refundMaxPercent}
                  onChange={(e) => onUpdate("refundMaxPercent", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Jamais plus de X % du montant de la transaction.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Plafond mensuel / déménageur (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.refundMaxPerMoverMonthly}
                  onChange={(e) => onUpdate("refundMaxPerMoverMonthly", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Somme max cumulée sur le mois civil en cours. 0 = illimité.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Plafond annuel / déménageur (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.refundMaxPerMoverYearly}
                  onChange={(e) => onUpdate("refundMaxPerMoverYearly", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Cumul sur les 365 derniers jours. 0 = illimité.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Délai entre deux remboursements (jours)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.refundCooldownDays}
                  onChange={(e) => onUpdate("refundCooldownDays", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Pour un même déménageur. 0 = pas de cooldown.
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-gray-50/50 p-4 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={settings.refundOncePerTransaction}
                  onChange={(e) => onUpdate("refundOncePerTransaction", e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--brand-green)]"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Une seule fois par transaction</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Empêche de rembourser deux fois la même transaction.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <div className="text-xs text-blue-900">
              <p className="font-semibold">Fonctionnement</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>
                  Lorsqu&apos;un admin crédite un portefeuille, un email est envoyé au déménageur (template « Remboursement portefeuille »).
                </li>
                <li>
                  Lors du prochain achat de lead, le solde du portefeuille est consommé en priorité avant la carte.
                </li>
                <li>
                  Les crédits expirés sont ignorés automatiquement — le solde affiché ne tient compte que des crédits valides.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
