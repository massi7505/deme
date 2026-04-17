"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  Euro,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  Building2,
  Download,
  RefreshCw,
  Loader2,
  Clock,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv-export";
import toast from "react-hot-toast";

interface PerCompany {
  companyId: string;
  name: string;
  revenueCents: number;
  refundedCents: number;
  refundedWalletCents: number;
  refundedBankCents: number;
  liabilityCents: number;
  netCents: number;
}

interface SoonExpiring {
  id: string;
  company_id: string;
  amount_cents: number;
  expires_at: string;
  reason: string | null;
}

interface AccountingData {
  period: "month" | "year" | "all";
  kpis: {
    grossRevenueCents: number;
    unlockRevenueCents: number;
    subscriptionRevenueCents: number;
    refundsIssuedCents: number;
    refundsWalletCents: number;
    refundsBankCents: number;
    walletConsumedCents: number;
    netRevenueCents: number;
    liabilityCents: number;
    expiredCreditsCents: number;
    transactionCount: number;
    refundCount: number;
    walletRefundCount: number;
    bankRefundCount: number;
    avgRefundPercent: number | null;
  };
  perCompany: PerCompany[];
  soonExpiring: SoonExpiring[];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default function AdminComptabilite() {
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"month" | "year" | "all">("month");

  async function load(p: "month" | "year" | "all") {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/accounting?period=${p}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Impossible de charger la comptabilité");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(period);
  }, [period]);

  const kpis = data?.kpis;
  const perCompany = data?.perCompany || [];

  const periodLabel = useMemo(() => {
    if (period === "month") return "Ce mois";
    if (period === "year") return "Cette année";
    return "Depuis le début";
  }, [period]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <BookOpenCheck className="h-6 w-6 text-[var(--brand-green)]" />
            Comptabilité
          </h2>
          <p className="text-sm text-muted-foreground">
            {periodLabel} — vue financière globale et par déménageur
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border bg-white p-0.5">
            {(["month", "year", "all"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                  (period === p
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-50")
                }
              >
                {p === "month" ? "Mois" : p === "year" ? "Année" : "Tout"}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(period)}
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
          </button>
          <button
            onClick={() =>
              downloadCSV(
                perCompany.map((c) => ({
                  Déménageur: c.name,
                  "Revenu brut (€)": (c.revenueCents / 100).toFixed(2),
                  "Remb. wallet (€)": (c.refundedWalletCents / 100).toFixed(2),
                  "Remb. banque (€)": (c.refundedBankCents / 100).toFixed(2),
                  "Remb. total (€)": (c.refundedCents / 100).toFixed(2),
                  "Solde wallet (€)": (c.liabilityCents / 100).toFixed(2),
                  "Net (€)": (c.netCents / 100).toFixed(2),
                })),
                `comptabilite-${period}`
              )
            }
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Revenu brut"
            value={formatPrice(kpis.grossRevenueCents)}
            sublabel={`${kpis.transactionCount} paiement${kpis.transactionCount > 1 ? "s" : ""}`}
            icon={Euro}
            color="bg-green-50 text-green-600"
          />
          <KpiCard
            label="Remboursé"
            value={formatPrice(kpis.refundsIssuedCents)}
            sublabel={`${kpis.refundCount} remboursement${kpis.refundCount > 1 ? "s" : ""}`}
            icon={TrendingDown}
            color="bg-amber-50 text-amber-600"
          />
          <KpiCard
            label="Revenu net"
            value={formatPrice(kpis.netRevenueCents)}
            sublabel="Brut − remboursements"
            icon={TrendingUp}
            color="bg-blue-50 text-blue-600"
          />
          <KpiCard
            label="Dette portefeuille"
            value={formatPrice(kpis.liabilityCents)}
            sublabel="Crédits actifs non consommés"
            icon={Wallet}
            color="bg-purple-50 text-purple-600"
          />
        </div>
      )}

      {/* Refund split */}
      {kpis && (
        <div className="grid gap-3 sm:grid-cols-3">
          <SubKpi
            label={`Wallet (${kpis.walletRefundCount})`}
            value={formatPrice(kpis.refundsWalletCents)}
            icon={Wallet}
            tooltip="Crédits portefeuille — l'argent reste sur la plateforme"
          />
          <SubKpi
            label={`Banque (${kpis.bankRefundCount})`}
            value={formatPrice(kpis.refundsBankCents)}
            icon={TrendingDown}
            tooltip="Remboursements carte via Mollie — argent sorti de la plateforme"
          />
          <SubKpi
            label="% moyen appliqué"
            value={kpis.avgRefundPercent != null ? `${kpis.avgRefundPercent.toFixed(1)} %` : "—"}
            icon={TrendingUp}
            tooltip="Moyenne du % remboursé par transaction source"
          />
        </div>
      )}

      {/* Sub KPIs */}
      {kpis && (
        <div className="grid gap-3 sm:grid-cols-3">
          <SubKpi
            label="Portefeuille consommé"
            value={formatPrice(kpis.walletConsumedCents)}
            icon={Wallet}
          />
          <SubKpi
            label="Abonnements"
            value={formatPrice(kpis.subscriptionRevenueCents)}
            icon={Calendar}
          />
          <SubKpi
            label="Crédits expirés (cumul)"
            value={formatPrice(kpis.expiredCreditsCents)}
            icon={Clock}
            tooltip="Crédits de remboursement qui n'ont jamais été consommés avant leur date d'expiration. Gain net pour l'entreprise."
          />
        </div>
      )}

      {/* Per company */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-[var(--brand-green)]" />
            Par déménageur ({perCompany.length})
          </h3>
        </div>
        {perCompany.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Aucune activité sur la période.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Déménageur</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenu</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground" title="Crédits portefeuille">R. wallet</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground" title="Remboursement carte">R. banque</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Solde wallet</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net</th>
                </tr>
              </thead>
              <tbody>
                {perCompany.map((c) => (
                  <tr key={c.companyId} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                      {formatPrice(c.revenueCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600">
                      {c.refundedWalletCents > 0 ? `-${formatPrice(c.refundedWalletCents)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {c.refundedBankCents > 0 ? `-${formatPrice(c.refundedBankCents)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-600">
                      {c.liabilityCents > 0 ? formatPrice(c.liabilityCents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatPrice(c.netCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Soon expiring */}
      {data && data.soonExpiring.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-200 px-5 py-3">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-900">
              Crédits expirant sous 30 jours ({data.soonExpiring.length})
            </h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {data.soonExpiring.map((t) => (
                  <tr key={t.id} className="border-b border-amber-100 last:border-0">
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {formatDate(t.expires_at)}
                    </td>
                    <td className="px-4 py-2 text-xs">{t.reason || "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold text-amber-700">
                      {formatPrice(t.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className={"mb-3 inline-flex rounded-lg p-2 " + color}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {sublabel && <div className="mt-1 text-[11px] text-muted-foreground/80">{sublabel}</div>}
    </div>
  );
}

function SubKpi({
  label,
  value,
  icon: Icon,
  tooltip,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip?: string;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 shadow-sm"
      title={tooltip}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
