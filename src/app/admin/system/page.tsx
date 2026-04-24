"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type HealthStatus = "ok" | "warn" | "error" | "unknown";

interface HealthCard {
  source: string;
  status: HealthStatus;
  headline: string;
  details: { label: string; value: string }[];
  error?: string;
}

interface CronHealth {
  name: string;
  schedule: string;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastSuccess: boolean | null;
  lastError: string | null;
  lastMeta: unknown;
  status: HealthStatus;
}

interface SystemHealth {
  generatedAt: string;
  cards: HealthCard[];
  crons: CronHealth[];
}

const STATUS_STYLES: Record<HealthStatus, { chip: string; icon: JSX.Element; ring: string }> = {
  ok: {
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-4 w-4" />,
    ring: "border-emerald-200",
  },
  warn: {
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <AlertTriangle className="h-4 w-4" />,
    ring: "border-amber-200",
  },
  error: {
    chip: "bg-red-50 text-red-700 border-red-200",
    icon: <XCircle className="h-4 w-4" />,
    ring: "border-red-300",
  },
  unknown: {
    chip: "bg-gray-50 text-gray-600 border-gray-200",
    icon: <HelpCircle className="h-4 w-4" />,
    ring: "border-gray-200",
  },
};

const STATUS_LABELS: Record<HealthStatus, string> = {
  ok: "OK",
  warn: "Attention",
  error: "Erreur",
  unknown: "Inconnu",
};

export default function AdminSystemPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/system", { cache: "no-store" });
      if (!res.ok) {
        setLoadError(`HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as SystemHealth;
      setHealth(data);
      setLastLoadedAt(new Date());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Système</h2>
          <p className="text-sm text-muted-foreground">
            Santé des services externes, CWM des crons et dernier déploiement
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastLoadedAt && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Mis à jour {lastLoadedAt.toLocaleTimeString("fr-FR")}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Actualiser
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Impossible de charger l&apos;état système : {loadError}
        </div>
      )}

      {/* Service cards */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--brand-green)]" />
          <h3 className="text-sm font-semibold">Services externes</h3>
        </div>
        {!health ? (
          <SkeletonGrid />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {health.cards.map((card) => (
              <CardView key={card.source} card={card} />
            ))}
          </div>
        )}
      </section>

      {/* Crons */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--brand-green)]" />
          <h3 className="text-sm font-semibold">Crons programmés</h3>
        </div>
        {!health ? (
          <div className="rounded-xl border bg-white p-5 text-sm text-muted-foreground">
            Chargement...
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Job</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Planning</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Dernière exécution</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Durée</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {health.crons.map((cron) => (
                  <CronRow key={cron.name} cron={cron} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CardView({ card }: { card: HealthCard }) {
  const s = STATUS_STYLES[card.status];
  return (
    <div className={cn("rounded-xl border-2 bg-white p-5 shadow-sm", s.ring)}>
      <div className="flex items-start justify-between border-b pb-3">
        <h4 className="font-display text-base font-bold">{card.source}</h4>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
            s.chip
          )}
        >
          {s.icon}
          {STATUS_LABELS[card.status]}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{card.headline}</p>
      {card.details.length > 0 && (
        <dl className="mt-3 space-y-1 text-xs">
          {card.details.map((d, i) => (
            <div key={i} className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">{d.label}</dt>
              <dd className="truncate text-right font-mono text-foreground" title={d.value}>
                {d.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {card.error && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs font-mono text-red-700">
          {card.error}
        </p>
      )}
    </div>
  );
}

function CronRow({ cron }: { cron: CronHealth }) {
  const s = STATUS_STYLES[cron.status];
  let durationMs: number | null = null;
  if (cron.lastStartedAt && cron.lastFinishedAt) {
    durationMs = new Date(cron.lastFinishedAt).getTime() - new Date(cron.lastStartedAt).getTime();
  }
  return (
    <tr className="border-b last:border-0 align-top">
      <td className="px-4 py-3">
        <div className="font-mono text-xs font-semibold">{cron.name}</div>
        {cron.lastError && (
          <div className="mt-1 max-w-[360px] truncate text-xs text-red-600" title={cron.lastError}>
            {cron.lastError}
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{cron.schedule}</td>
      <td className="px-4 py-3 text-xs">
        {cron.lastStartedAt ? (
          <>
            <div>{formatDate(cron.lastStartedAt)}</div>
            {!cron.lastFinishedAt && (
              <div className="text-amber-600">(démarré, pas de fin)</div>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">Jamais</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
        {durationMs != null ? `${(durationMs / 1000).toFixed(1)}s` : "—"}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
            s.chip
          )}
        >
          {s.icon}
          {STATUS_LABELS[cron.status]}
        </span>
      </td>
    </tr>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border-2 border-gray-100 bg-white p-5 shadow-sm">
          <div className="h-5 w-24 animate-pulse rounded bg-gray-100" />
          <div className="mt-3 h-4 w-40 animate-pulse rounded bg-gray-100" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
