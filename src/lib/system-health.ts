import { createUntypedAdminClient } from "@/lib/supabase/admin";

export type HealthStatus = "ok" | "warn" | "error" | "unknown";

export interface HealthCard {
  source: string;
  status: HealthStatus;
  headline: string;
  details: { label: string; value: string }[];
  error?: string;
}

export interface CronHealth {
  name: string;
  schedule: string;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastSuccess: boolean | null;
  lastError: string | null;
  lastMeta: unknown;
  status: HealthStatus;
}

export interface SystemHealth {
  generatedAt: string;
  cards: HealthCard[];
  crons: CronHealth[];
}

const SOURCE_TIMEOUT_MS = 5000;

async function withTimeout<T>(p: Promise<T>, ms: number, source: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`${source}: timeout after ${ms}ms`)),
          ms
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function errorCard(source: string, err: unknown): HealthCard {
  const message = err instanceof Error ? err.message : String(err);
  return {
    source,
    status: "error",
    headline: "Erreur lors du check",
    details: [],
    error: message,
  };
}

function missingEnvCard(source: string, envName: string): HealthCard {
  return {
    source,
    status: "unknown",
    headline: "Non configuré",
    details: [{ label: "Env manquante", value: envName }],
  };
}

// ─── SMSFactor ────────────────────────────────────────────────────────────

async function checkSmsFactor(): Promise<HealthCard> {
  const apiKey = process.env.SMSFACTOR_API_KEY;
  if (!apiKey) return missingEnvCard("SMSFactor", "SMSFACTOR_API_KEY");

  try {
    const res = await withTimeout(
      fetch("https://api.smsfactor.com/credits", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }),
      SOURCE_TIMEOUT_MS,
      "SMSFactor"
    );
    if (!res.ok) {
      return {
        source: "SMSFactor",
        status: "error",
        headline: `HTTP ${res.status}`,
        details: [],
        error: await res.text().catch(() => "unreadable body"),
      };
    }
    const data = (await res.json()) as Record<string, unknown>;

    // The /credits endpoint has varied across SMSFactor API versions. Try
    // every field path we've seen in the wild before giving up — the account
    // dashboard is the source of truth if this probe can't parse a value.
    const raw =
      extractNumberField(data, ["credits"]) ??
      extractNumberField(data, ["credit"]) ??
      extractNumberField(data, ["details", "credits"]) ??
      extractNumberField(data, ["details", "credit"]) ??
      extractNumberField(data, ["data", "credits"]) ??
      null;

    if (raw == null) {
      const preview = JSON.stringify(data).slice(0, 120);
      return {
        source: "SMSFactor",
        status: "unknown",
        headline: "Format de réponse inconnu",
        details: [{ label: "Réponse", value: preview }],
      };
    }

    let status: HealthStatus = "ok";
    if (raw < 50) status = "error";
    else if (raw < 200) status = "warn";

    return {
      source: "SMSFactor",
      status,
      headline: `${raw} SMS restants`,
      details: [{ label: "Seuil warn/alert", value: "200 / 50" }],
    };
  } catch (err) {
    return errorCard("SMSFactor", err);
  }
}

function extractNumberField(obj: unknown, path: string[]): number | null {
  let cursor: unknown = obj;
  for (const key of path) {
    if (cursor && typeof cursor === "object" && key in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[key];
    } else {
      return null;
    }
  }
  if (typeof cursor === "number") return Number.isFinite(cursor) ? cursor : null;
  if (typeof cursor === "string") {
    const n = parseFloat(cursor);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ─── Resend ───────────────────────────────────────────────────────────────

async function checkResend(): Promise<HealthCard> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return missingEnvCard("Resend", "RESEND_API_KEY");

  try {
    const res = await withTimeout(
      fetch("https://api.resend.com/domains", {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
      SOURCE_TIMEOUT_MS,
      "Resend"
    );
    if (!res.ok) {
      return {
        source: "Resend",
        status: "error",
        headline: `HTTP ${res.status}`,
        details: [],
        error: await res.text().catch(() => "unreadable body"),
      };
    }
    const data = (await res.json()) as { data?: Array<{ name: string; status: string }> };
    const domains = data?.data ?? [];
    const verified = domains.filter((d) => d.status === "verified").length;

    return {
      source: "Resend",
      status: domains.length === 0 ? "warn" : verified === 0 ? "warn" : "ok",
      headline:
        domains.length === 0
          ? "Aucun domaine configuré"
          : `${verified}/${domains.length} domaines vérifiés`,
      details: domains.slice(0, 5).map((d) => ({ label: d.name, value: d.status })),
    };
  } catch (err) {
    return errorCard("Resend", err);
  }
}

// ─── Mollie ───────────────────────────────────────────────────────────────

async function checkMollie(): Promise<HealthCard> {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) return missingEnvCard("Mollie", "MOLLIE_API_KEY");

  const mode = apiKey.startsWith("live_") ? "live" : apiKey.startsWith("test_") ? "test" : "unknown";

  const headers = { Authorization: `Bearer ${apiKey}` };

  // /v2/balances is LIVE-only — it returns HTTP 400 on test keys. Try balances
  // first in live mode; in test mode (or on fallback), use /v2/methods which
  // is the same lightweight auth check `admin/test-mollie` already relies on.
  try {
    if (mode === "live") {
      const res = await withTimeout(
        fetch("https://api.mollie.com/v2/balances", { method: "GET", headers }),
        SOURCE_TIMEOUT_MS,
        "Mollie"
      );
      if (res.ok) {
        const data = (await res.json()) as {
          _embedded?: {
            balances?: Array<{
              currency: string;
              availableAmount?: { value: string; currency: string };
              pendingAmount?: { value: string; currency: string };
            }>;
          };
        };
        const balances = data?._embedded?.balances ?? [];
        const primary = balances[0];
        return {
          source: "Mollie",
          status: "ok",
          headline: primary
            ? `${primary.availableAmount?.value ?? "?"} ${primary.availableAmount?.currency ?? ""} dispo`
            : "Compte Mollie actif",
          details: [
            { label: "Mode", value: "LIVE" },
            ...(primary?.pendingAmount
              ? [{ label: "En attente", value: `${primary.pendingAmount.value} ${primary.pendingAmount.currency}` }]
              : []),
            { label: "Devises", value: balances.map((b) => b.currency).join(", ") || "—" },
          ],
        };
      }
      // live key but balances failed (account not yet eligible, etc.) — fall through to methods probe.
    }

    const res = await withTimeout(
      fetch("https://api.mollie.com/v2/methods", { method: "GET", headers }),
      SOURCE_TIMEOUT_MS,
      "Mollie"
    );
    if (!res.ok) {
      return {
        source: "Mollie",
        status: "error",
        headline: `HTTP ${res.status}`,
        details: [{ label: "Mode", value: mode.toUpperCase() }],
        error: await res.text().catch(() => "unreadable body"),
      };
    }
    const data = (await res.json()) as { count?: number; _embedded?: { methods?: Array<{ id: string }> } };
    const methodsCount = data?.count ?? data?._embedded?.methods?.length ?? 0;

    return {
      source: "Mollie",
      status: mode === "live" ? "ok" : "warn",
      headline: `Clé valide — ${methodsCount} méthodes`,
      details: [
        { label: "Mode", value: mode.toUpperCase() },
        ...(mode === "test"
          ? [{ label: "Solde", value: "Indisponible en test" }]
          : []),
      ],
    };
  } catch (err) {
    return errorCard("Mollie", err);
  }
}

// ─── Supabase ─────────────────────────────────────────────────────────────

async function checkSupabase(): Promise<HealthCard> {
  try {
    const admin = createUntypedAdminClient();
    const start = Date.now();
    const query = admin.from("quote_requests").select("*", { count: "exact", head: true });
    const { count, error } = (await withTimeout(
      Promise.resolve(query),
      SOURCE_TIMEOUT_MS,
      "Supabase"
    )) as { count: number | null; error: { message: string } | null };
    const latencyMs = Date.now() - start;

    if (error) {
      return {
        source: "Supabase",
        status: "error",
        headline: "DB injoignable",
        details: [{ label: "Latence", value: `${latencyMs}ms` }],
        error: error.message,
      };
    }

    const status: HealthStatus = latencyMs > 2000 ? "warn" : "ok";

    return {
      source: "Supabase",
      status,
      headline: `DB OK — ${latencyMs}ms`,
      details: [
        { label: "Latence", value: `${latencyMs}ms` },
        { label: "quote_requests", value: String(count ?? 0) },
      ],
    };
  } catch (err) {
    return errorCard("Supabase", err);
  }
}

// ─── Vercel ───────────────────────────────────────────────────────────────

async function checkVercel(): Promise<HealthCard> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token) return missingEnvCard("Vercel", "VERCEL_API_TOKEN");
  if (!projectId) return missingEnvCard("Vercel", "VERCEL_PROJECT_ID");

  const teamId = process.env.VERCEL_TEAM_ID;
  const qs = new URLSearchParams({ projectId, limit: "1" });
  if (teamId) qs.set("teamId", teamId);

  try {
    const res = await withTimeout(
      fetch(`https://api.vercel.com/v6/deployments?${qs.toString()}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }),
      SOURCE_TIMEOUT_MS,
      "Vercel"
    );
    if (!res.ok) {
      return {
        source: "Vercel",
        status: "error",
        headline: `HTTP ${res.status}`,
        details: [],
        error: await res.text().catch(() => "unreadable body"),
      };
    }
    const data = (await res.json()) as {
      deployments?: Array<{
        state: string;
        target: string | null;
        created: number;
        url: string;
        readyState: string;
      }>;
    };
    const latest = data?.deployments?.[0];
    if (!latest) {
      return {
        source: "Vercel",
        status: "warn",
        headline: "Aucun déploiement",
        details: [],
      };
    }
    const readyState = latest.readyState || latest.state;
    const status: HealthStatus =
      readyState === "READY" ? "ok" : readyState === "ERROR" ? "error" : "warn";

    return {
      source: "Vercel",
      status,
      headline: `Dernier déploiement : ${readyState}`,
      details: [
        { label: "Target", value: latest.target || "preview" },
        { label: "Date", value: new Date(latest.created).toLocaleString("fr-FR") },
        { label: "URL", value: latest.url },
      ],
    };
  } catch (err) {
    return errorCard("Vercel", err);
  }
}

// ─── Crons ────────────────────────────────────────────────────────────────

const CRON_SCHEDULES: Record<string, string> = {
  "reconcile-payments": "*/15 * * * *",
  "send-review-emails": "0 * * * *",
  "warn-wallet-expiry": "0 9 * * *",
  "reengage-clients": "0 10 * * *",
};

// Max age (ms) before a cron is considered stale per schedule cadence.
const CRON_STALE_MS: Record<string, number> = {
  "reconcile-payments": 45 * 60 * 1000, // 3× the 15-min cadence (absorbs Vercel jitter)
  "send-review-emails": 2 * 60 * 60 * 1000, // 2× hourly
  "warn-wallet-expiry": 30 * 60 * 60 * 1000, // ~1.25× daily
  "reengage-clients": 30 * 60 * 60 * 1000, // ~1.25× daily
};

async function checkCrons(): Promise<CronHealth[]> {
  try {
    const admin = createUntypedAdminClient();
    const names = Object.keys(CRON_SCHEDULES);
    const out: CronHealth[] = [];

    for (const name of names) {
      const { data } = await admin
        .from("cron_runs")
        .select("started_at, finished_at, success, error, meta")
        .eq("cron_name", name)
        .order("started_at", { ascending: false })
        .limit(1);

      const row = ((data || [])[0] ?? null) as {
        started_at: string;
        finished_at: string | null;
        success: boolean | null;
        error: string | null;
        meta: unknown;
      } | null;

      let status: HealthStatus = "unknown";
      if (row) {
        const ageMs = Date.now() - new Date(row.started_at).getTime();
        const stale = ageMs > (CRON_STALE_MS[name] ?? Infinity);
        if (row.success === false) status = "error";
        else if (stale) status = "warn";
        else if (row.success === true) status = "ok";
        else status = "warn"; // started but never finished
      }

      out.push({
        name,
        schedule: CRON_SCHEDULES[name],
        lastStartedAt: row?.started_at ?? null,
        lastFinishedAt: row?.finished_at ?? null,
        lastSuccess: row?.success ?? null,
        lastError: row?.error ?? null,
        lastMeta: row?.meta ?? null,
        status,
      });
    }
    return out;
  } catch (err) {
    console.error("[system-health] checkCrons failed:", err);
    return Object.entries(CRON_SCHEDULES).map(([name, schedule]) => ({
      name,
      schedule,
      lastStartedAt: null,
      lastFinishedAt: null,
      lastSuccess: null,
      lastError: err instanceof Error ? err.message : String(err),
      lastMeta: null,
      status: "unknown" as const,
    }));
  }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────

export async function getSystemHealth(): Promise<SystemHealth> {
  const [smsfactor, resend, mollie, supabase, vercel, crons] = await Promise.all([
    checkSmsFactor().catch((err) => errorCard("SMSFactor", err)),
    checkResend().catch((err) => errorCard("Resend", err)),
    checkMollie().catch((err) => errorCard("Mollie", err)),
    checkSupabase().catch((err) => errorCard("Supabase", err)),
    checkVercel().catch((err) => errorCard("Vercel", err)),
    checkCrons(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    cards: [smsfactor, resend, mollie, supabase, vercel],
    crons,
  };
}
