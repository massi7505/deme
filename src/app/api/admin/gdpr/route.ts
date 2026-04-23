import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { findClientQuotes } from "@/lib/gdpr";

const MAX_EMAIL_LEN = 320;
const MAX_PROSPECT_ID_LEN = 64;

/** GET /api/admin/gdpr — last 50 audit-log rows. */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const admin = createUntypedAdminClient();
  const { data, error } = await admin
    .from("gdpr_requests")
    .select("id, action, email_hash, admin_email, affected_rows, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ history: data || [] });
}

/** POST /api/admin/gdpr — search.
 *  Body: { email?: string, prospectId?: string } */
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const prospectId = typeof body.prospectId === "string" ? body.prospectId.trim() : "";

  if (!email && !prospectId) {
    return NextResponse.json(
      { error: "Fournissez un email ou un prospect_id" },
      { status: 400 }
    );
  }
  if (email.length > MAX_EMAIL_LEN || prospectId.length > MAX_PROSPECT_ID_LEN) {
    return NextResponse.json({ error: "Entrée trop longue" }, { status: 400 });
  }

  const admin = createUntypedAdminClient();
  try {
    const result = await findClientQuotes(admin, { email, prospectId });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
