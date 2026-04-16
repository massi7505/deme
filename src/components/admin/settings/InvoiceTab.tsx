"use client";

import { Receipt } from "lucide-react";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  onUpdate: (field: keyof Settings, value: string) => void;
}

export default function InvoiceTab({ settings, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      {/* Company info on invoice */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Receipt className="h-4 w-4 text-[var(--brand-green)]" /> Informations sur la facture
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Ces informations apparaissent sur chaque facture PDF generee.
            Si vides, le nom du site et l&apos;email de contact seront utilises.
          </p>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nom de l&apos;entreprise</label>
              <input
                value={settings.invoiceCompanyName}
                onChange={(e) => onUpdate("invoiceCompanyName", e.target.value)}
                placeholder={settings.siteName || "Demenagement24"}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
              />
              <p className="mt-1 text-xs text-muted-foreground">Apparait en haut de la facture</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email de facturation</label>
              <input
                value={settings.invoiceEmail}
                onChange={(e) => onUpdate("invoiceEmail", e.target.value)}
                placeholder={settings.contactEmail || "contact@demenagement24.com"}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Adresse</label>
              <input
                value={settings.invoiceAddress}
                onChange={(e) => onUpdate("invoiceAddress", e.target.value)}
                placeholder="123 rue de la Paix"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Code postal</label>
              <input
                value={settings.invoicePostalCode}
                onChange={(e) => onUpdate("invoicePostalCode", e.target.value)}
                placeholder="75001"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Ville</label>
              <input
                value={settings.invoiceCity}
                onChange={(e) => onUpdate("invoiceCity", e.target.value)}
                placeholder="Paris"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">SIRET</label>
              <input
                value={settings.invoiceSiret}
                onChange={(e) => onUpdate("invoiceSiret", e.target.value)}
                placeholder="123 456 789 00012"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">N° TVA intracommunautaire</label>
              <input
                value={settings.invoiceVatNumber}
                onChange={(e) => onUpdate("invoiceVatNumber", e.target.value)}
                placeholder="FR 12 345678901"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & VAT */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Receipt className="h-4 w-4 text-[var(--brand-green)]" /> Prix et TVA
          </h3>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Mode de prix</label>
              <select
                value={settings.invoicePriceMode}
                onChange={(e) => onUpdate("invoicePriceMode", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
              >
                <option value="ttc">TTC (prix final affiché)</option>
                <option value="ht">HT (hors taxes)</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                TTC : le prix 12,00 € est le montant total. HT : la TVA est ajoutée en plus.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Taux de TVA (%)</label>
              <input
                type="number"
                value={settings.invoiceVatRate}
                onChange={(e) => onUpdate("invoiceVatRate", e.target.value)}
                min="0"
                max="30"
                step="0.1"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Prefixe de numeration</label>
              <input
                value={settings.invoicePrefix}
                onChange={(e) => onUpdate("invoicePrefix", e.target.value)}
                placeholder="FA"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
              />
              <p className="mt-1 text-xs text-muted-foreground">Ex: FA-2026-0001</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conditions & Footer */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Receipt className="h-4 w-4 text-[var(--brand-green)]" /> Pied de page et conditions
          </h3>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Pied de page de la facture</label>
            <input
              value={settings.invoiceFooter}
              onChange={(e) => onUpdate("invoiceFooter", e.target.value)}
              placeholder="Paiement effectue par carte bancaire via Mollie."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Conditions de vente</label>
            <textarea
              value={settings.invoiceConditions}
              onChange={(e) => onUpdate("invoiceConditions", e.target.value)}
              rows={3}
              placeholder="Ex: En cas de retard de paiement, une penalite de 3 fois le taux d'interet legal sera appliquee..."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] resize-y"
            />
            <p className="mt-1 text-xs text-muted-foreground">Affiché en bas de la facture, avant le pied de page</p>
          </div>
        </div>
      </div>
    </div>
  );
}
