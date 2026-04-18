import type { createUntypedAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createUntypedAdminClient>;

/**
 * French labels stored in `claims.reason`. Mapping is intentional:
 * these four indicate a factual defect of the lead itself. "Client déjà
 * contacté" is excluded — that's legitimate friction (client picked another
 * mover, unreachable, etc.) and doesn't mean the lead was bad.
 */
export const HARD_REASONS = new Set<string>([
  "Fausse demande",
  "Doublon",
  "Numéro invalide",
  "Client déjà déménagé",
]);

export const DEFECT_THRESHOLD = 4;

export function isHardReason(reason: string): boolean {
  return HARD_REASONS.has(reason);
}

export function shouldFlagDefect(hardClaimCount: number): boolean {
  return hardClaimCount >= DEFECT_THRESHOLD;
}

/**
 * After a new claim is filed, count hard-reason pending claims on the
 * underlying lead. If the count crosses the threshold and the lead isn't
 * already flagged/resolved, flag it and notify the admin.
 * Idempotent — calling twice won't create duplicate flags or notifications.
 */
export async function checkAndFlagDefectiveLead(
  admin: Admin,
  quoteRequestId: string
): Promise<{ flagged: boolean; count: number }> {
  const { data: distributions } = await admin
    .from("quote_distributions")
    .select("id")
    .eq("quote_request_id", quoteRequestId);

  const distIds = ((distributions || []) as Array<{ id: string }>).map((d) => d.id);
  if (distIds.length === 0) return { flagged: false, count: 0 };

  const { count: rawCount } = await admin
    .from("claims")
    .select("id", { count: "exact", head: true })
    .in("quote_distribution_id", distIds)
    .in("reason", Array.from(HARD_REASONS))
    .eq("status", "pending");

  const count = rawCount ?? 0;
  if (!shouldFlagDefect(count)) return { flagged: false, count };

  const { data: lead } = await admin
    .from("quote_requests")
    .select("defect_status")
    .eq("id", quoteRequestId)
    .single();

  if ((lead as { defect_status: string | null } | null)?.defect_status) {
    return { flagged: false, count };
  }

  await admin
    .from("quote_requests")
    .update({
      defect_status: "suspected",
      defect_flagged_at: new Date().toISOString(),
    })
    .eq("id", quoteRequestId);

  await admin.from("notifications").insert({
    type: "system",
    title: "Lead confirmé défectueux",
    body: `${count} signalements sur le même lead — validation requise`,
    data: { quoteRequestId, claimCount: count },
  });

  return { flagged: true, count };
}
