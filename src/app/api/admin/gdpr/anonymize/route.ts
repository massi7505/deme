import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getAdminEmailFromRequest } from "@/lib/admin-auth";
import { hashEmail } from "@/lib/gdpr";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AnonymizeCounts {
  quote_requests_updated: number;
  reviews_updated: number;
  review_tokens_deleted: number;
  rate_limit_deleted: number;
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const body = await request.json().catch(() => ({}));
  const ids: unknown = body.quoteRequestIds;
  const confirmation = body.confirmation;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 500) : null;

  if (confirmation !== "ANONYMISER") {
    return NextResponse.json(
      { error: "Confirmation manquante (tapez ANONYMISER)" },
      { status: 400 }
    );
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Aucun quote_request_id" }, { status: 400 });
  }
  const idList = ids.filter((v): v is string => typeof v === "string" && UUID_RE.test(v));
  if (idList.length !== ids.length) {
    return NextResponse.json({ error: "UUID invalide dans la liste" }, { status: 400 });
  }

  const admin = createUntypedAdminClient();
  const adminEmail = getAdminEmailFromRequest(request) || "unknown";

  // Capture the original email BEFORE anonymization so we can hash it
  // for the audit log. Pick the first row's email (all ids in one request
  // should belong to the same client — enforced by the UI, not the API).
  const { data: preRows, error: preErr } = await admin
    .from("quote_requests")
    .select("id, client_email")
    .in("id", idList);

  if (preErr) {
    console.error("[gdpr/anonymize] pre-fetch failed", preErr);
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 });
  }

  // Ghost-delete guard: every id must resolve. Silent zero-count returns
  // would orphan the audit log (no email to hash).
  if (!preRows || preRows.length !== idList.length) {
    return NextResponse.json(
      { error: "Certains identifiants sont introuvables — rechargez la page" },
      { status: 400 }
    );
  }

  const originalEmail =
    ((preRows[0] as { client_email: string | null } | undefined)
      ?.client_email) || null;

  // Single-transaction batch RPC (migration 027). Rolls back atomically
  // if any step fails mid-batch.
  const { data, error } = await admin.rpc("anonymize_quote_requests", {
    p_quote_request_ids: idList,
  });
  if (error) {
    console.error("[gdpr/anonymize] RPC failed", { idList, error });
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 });
  }
  const row = (Array.isArray(data) ? data[0] : data) as AnonymizeCounts | null;
  const affected = {
    quoteRequests: row?.quote_requests_updated ?? 0,
    reviews: row?.reviews_updated ?? 0,
    reviewTokens: row?.review_tokens_deleted ?? 0,
    rateLimitEvents: row?.rate_limit_deleted ?? 0,
  };

  const totalAffected =
    affected.quoteRequests +
    affected.reviews +
    affected.reviewTokens +
    affected.rateLimitEvents;

  await admin.from("gdpr_requests").insert({
    action: "anonymize",
    email_hash: originalEmail ? hashEmail(originalEmail) : "",
    admin_email: adminEmail,
    affected_rows: totalAffected,
    notes,
  });

  return NextResponse.json({
    success: true,
    affectedRows: affected,
    totalAffected,
  });
}
