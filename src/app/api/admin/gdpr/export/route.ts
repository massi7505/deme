import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getAdminEmailFromRequest } from "@/lib/admin-auth";
import { buildClientExport, hashEmail } from "@/lib/gdpr";

const MAX_EMAIL_LEN = 320;
const MAX_PROSPECT_ID_LEN = 64;

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
  const adminEmail = getAdminEmailFromRequest(request) || "unknown";

  let payload;
  try {
    payload = await buildClientExport(admin, { email, prospectId });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  // Always log — even an empty export counts as "request handled in time".
  const emailHash = payload.requestedFor
    ? hashEmail(payload.requestedFor)
    : "";
  if (emailHash) {
    await admin.from("gdpr_requests").insert({
      action: "export",
      email_hash: emailHash,
      admin_email: adminEmail,
      affected_rows: 0,
      notes: typeof body.notes === "string" ? body.notes.slice(0, 500) : null,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const firstProspect = payload.quoteRequests[0]?.prospect_id || "unknown";
  const filename = `gdpr-export-${firstProspect}-${today}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
