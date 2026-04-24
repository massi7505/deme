import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { getSession, mapDiditStatus, type DiditStatus } from "@/lib/didit";

/**
 * Returns the mover's current kyc_status. Self-heals when the status is stuck
 * in "in_review" but didit already has a terminal decision — this covers the
 * case where the webhook was dropped (signature mismatch, transient network,
 * env var not yet propagated, etc.).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("id, kyc_status, didit_session_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ kyc_status: "pending" });
  }

  // Self-heal: if we have a didit session, ask didit for the authoritative
  // decision and reconcile. Covers two cases:
  //   - webhook dropped (stuck at in_review or pending despite a real decision)
  //   - mover clicked start then bailed without uploading (stuck at in_review
  //     from an older bug; didit reports pending → we downgrade back to pending
  //     so they can retry)
  // Covers pending AND in_review as starting states.
  if (
    (company.kyc_status === "pending" || company.kyc_status === "in_review") &&
    company.didit_session_id
  ) {
    try {
      const decision = await getSession(company.didit_session_id);
      const mapped = mapDiditStatus(decision.status as DiditStatus);
      if (mapped !== company.kyc_status) {
        const updates: Record<string, unknown> = { kyc_status: mapped };
        if (mapped === "approved") {
          updates.is_verified = true;
          updates.account_status = "active";
        }
        await admin.from("companies").update(updates).eq("id", company.id);
        return NextResponse.json({ kyc_status: mapped });
      }
    } catch (err) {
      console.warn("[kyc/status] didit reconcile failed:", (err as Error).message);
    }
  }

  return NextResponse.json({ kyc_status: company.kyc_status ?? "pending" });
}
