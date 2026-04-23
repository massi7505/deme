import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkIpRateLimit(ip, "public/reviews:POST", 3600, 10);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes, réessayez plus tard" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 3600) } }
    );
  }

  const admin = createUntypedAdminClient();
  const body = await request.json().catch(() => ({}));

  const token = (body.token || "").toString();
  const rating = Number(body.rating);
  const comment = body.comment ? String(body.comment).trim().slice(0, 2000) : null;
  const isAnonymous = !!body.isAnonymous;
  const reviewerName = body.reviewerName ? String(body.reviewerName).trim().slice(0, 100) : null;

  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    return NextResponse.json({ error: "Note invalide (1 à 10)" }, { status: 400 });
  }

  const { data: tokenRow } = await admin
    .from("review_tokens")
    .select("token, quote_request_id, company_id, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }
  const tk = tokenRow as {
    token: string;
    quote_request_id: string;
    company_id: string;
    used_at: string | null;
    expires_at: string;
  };
  if (tk.used_at) {
    return NextResponse.json({ error: "Avis déjà déposé" }, { status: 409 });
  }
  if (new Date(tk.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Lien expiré" }, { status: 410 });
  }

  // Insert the review
  const { error: insertError } = await admin.from("reviews").insert({
    company_id: tk.company_id,
    quote_request_id: tk.quote_request_id,
    rating,
    comment,
    is_anonymous: isAnonymous,
    is_verified: true,
    reviewer_name: isAnonymous ? null : reviewerName,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Mark token as used
  await admin
    .from("review_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  // Recompute the company rating/review_count
  const { data: allReviews } = await admin
    .from("reviews")
    .select("rating")
    .eq("company_id", tk.company_id);

  const reviews = (allReviews || []) as Array<{ rating: number }>;
  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  await admin
    .from("companies")
    .update({
      rating: Number(avg.toFixed(1)),
      review_count: count,
    })
    .eq("id", tk.company_id);

  // Notify the mover
  await admin.from("notifications").insert({
    company_id: tk.company_id,
    type: "review_received",
    title: "Nouvel avis client",
    body: `Vous avez reçu un avis ${rating}/10${comment ? " avec commentaire" : ""}.`,
    data: { rating, quoteRequestId: tk.quote_request_id },
  });

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkIpRateLimit(ip, "public/reviews:GET", 600, 30);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes, réessayez plus tard" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 600) } }
    );
  }

  const admin = createUntypedAdminClient();
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const { data: tokenRow } = await admin
    .from("review_tokens")
    .select("token, quote_request_id, company_id, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }
  const tk = tokenRow as {
    token: string;
    quote_request_id: string;
    company_id: string;
    used_at: string | null;
    expires_at: string;
  };
  if (tk.used_at) {
    return NextResponse.json({ error: "Avis déjà déposé", state: "used" }, { status: 409 });
  }
  if (new Date(tk.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Lien expiré", state: "expired" }, { status: 410 });
  }

  const [{ data: company }, { data: lead }] = await Promise.all([
    admin.from("companies").select("name, slug, logo_url").eq("id", tk.company_id).maybeSingle(),
    admin
      .from("quote_requests")
      .select("from_city, to_city, move_date, client_first_name")
      .eq("id", tk.quote_request_id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    company,
    lead,
    expiresAt: tk.expires_at,
  });
}
