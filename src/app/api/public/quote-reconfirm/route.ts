import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { verifyReconfirmToken } from "@/lib/quote-reconfirm-token";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-errors";

/**
 * POST handler for the J-3 re-engagement email click. Idempotent — clicking
 * the same link twice returns `already` instead of re-running the action.
 * The token encodes the quote_request_id AND the chosen action, so the
 * server only trusts the HMAC-verified payload, not the URL query string.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkIpRateLimit(ip, "public/quote-reconfirm", 600, 30);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes, réessayez plus tard" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 600) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const token = (body.token || "").toString();
  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const decoded = verifyReconfirmToken(token);
  if (!decoded) {
    return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 410 });
  }

  const admin = createUntypedAdminClient();
  const { data: quote, error } = await admin
    .from("quote_requests")
    .select("id, move_date, move_date_extended_to, reconfirmed_at, status")
    .eq("id", decoded.quoteRequestId)
    .maybeSingle();
  if (error) {
    return serverError("public/quote-reconfirm:lookup", error);
  }
  if (!quote) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  const q = quote as {
    id: string;
    move_date: string | null;
    move_date_extended_to: string | null;
    reconfirmed_at: string | null;
    status: string;
  };

  if (q.reconfirmed_at) {
    return NextResponse.json({ ok: true, already: true, action: decoded.action });
  }

  const nowIso = new Date().toISOString();
  if (decoded.action === "yes") {
    // Extend visibility by 7 days from either the existing extension or
    // move_date, whichever is later. Keeps move_date intact for analytics.
    const base = q.move_date_extended_to || q.move_date;
    if (!base) {
      return NextResponse.json({ error: "Date initiale manquante" }, { status: 400 });
    }
    const extended = new Date(new Date(base).getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const { error: upErr } = await admin
      .from("quote_requests")
      .update({ move_date_extended_to: extended, reconfirmed_at: nowIso })
      .eq("id", q.id);
    if (upErr) return serverError("public/quote-reconfirm:yes", upErr);
    return NextResponse.json({ ok: true, action: "yes", extendedUntil: extended });
  }

  // action === "no" → mark the quote completed so it disappears everywhere.
  const { error: upErr } = await admin
    .from("quote_requests")
    .update({ status: "completed", reconfirmed_at: nowIso })
    .eq("id", q.id);
  if (upErr) return serverError("public/quote-reconfirm:no", upErr);
  return NextResponse.json({ ok: true, action: "no" });
}
