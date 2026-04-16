import { NextRequest } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

/** Extract the public-facing IP from a Vercel/edge request. */
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    // x-forwarded-for is a comma-separated list; the leftmost is the client.
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export interface RateLimitCheckResult {
  ok: boolean;
  retryAfterSec?: number;
  count?: number;
}

/**
 * Check whether an IP has exceeded the per-endpoint rate limit in the
 * rolling window. If allowed, records a new event and returns { ok: true }.
 * If denied, returns { ok: false, retryAfterSec } based on the oldest
 * event still inside the window.
 *
 * Side effect: on each call, opportunistically deletes events older than
 * 24h so the table stays bounded without a dedicated cleanup job.
 */
export async function checkIpRateLimit(
  ip: string,
  endpoint: string,
  windowSec: number,
  max: number
): Promise<RateLimitCheckResult> {
  const supabase = createUntypedAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSec * 1000);

  // Count events in the current window.
  const { count, error: countError } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("endpoint", endpoint)
    .gte("created_at", windowStart.toISOString());

  if (countError) {
    // Fail open on DB errors — do not block legitimate users if our
    // rate-limit table is down.
    console.error("[rate-limit] count error, failing open:", countError.message);
    return { ok: true };
  }

  const currentCount = count ?? 0;

  if (currentCount >= max) {
    // Find the oldest event in the window to compute retry-after.
    const { data: oldest } = await supabase
      .from("rate_limit_events")
      .select("created_at")
      .eq("ip", ip)
      .eq("endpoint", endpoint)
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let retryAfterSec = windowSec;
    if (oldest?.created_at) {
      const oldestMs = new Date(oldest.created_at).getTime();
      const windowEndMs = oldestMs + windowSec * 1000;
      retryAfterSec = Math.max(1, Math.ceil((windowEndMs - now.getTime()) / 1000));
    }
    return { ok: false, retryAfterSec, count: currentCount };
  }

  // Record the new event.
  await supabase.from("rate_limit_events").insert({ ip, endpoint });

  // Opportunistic cleanup: delete events older than 24h. Fire-and-forget.
  const cleanupCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  supabase
    .from("rate_limit_events")
    .delete()
    .lt("created_at", cleanupCutoff)
    .then(({ error }) => {
      if (error) console.error("[rate-limit] cleanup error:", error.message);
    });

  return { ok: true, count: currentCount + 1 };
}
