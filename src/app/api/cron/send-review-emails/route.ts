import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { sendReviewRequestEmail } from "@/lib/resend";
import crypto from "crypto";

/**
 * Hourly cron. Picks leads whose move_date is >= 7 days ago, haven't been
 * emailed yet, have at least one unlocked distribution, and a client email
 * on file. For each qualifying lead, generates one token per unlocked mover
 * and sends an email. Writes `review_email_sent_at` on the lead so we don't
 * resend next hour.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: leads } = await admin
    .from("quote_requests")
    .select("id, client_email, client_first_name, from_city, to_city")
    .lte("move_date", cutoff)
    .is("review_email_sent_at", null)
    .not("client_email", "is", null)
    .limit(50);

  const rows = (leads || []) as Array<{
    id: string;
    client_email: string;
    client_first_name: string | null;
    from_city: string | null;
    to_city: string | null;
  }>;

  const result = { checked: rows.length, emailed: 0, skipped: 0, errors: 0 };

  for (const lead of rows) {
    try {
      const { data: dists } = await admin
        .from("quote_distributions")
        .select("company_id, companies(name)")
        .eq("quote_request_id", lead.id)
        .eq("status", "unlocked");

      const unlockedMovers = (dists || []) as unknown as Array<{
        company_id: string;
        companies: { name: string } | null;
      }>;

      if (unlockedMovers.length === 0) {
        // No mover bought this lead — nothing to review. Mark as processed to skip next hour.
        await admin
          .from("quote_requests")
          .update({ review_email_sent_at: new Date().toISOString() })
          .eq("id", lead.id);
        result.skipped += 1;
        continue;
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      for (const m of unlockedMovers) {
        const token = crypto.randomBytes(24).toString("base64url");
        // Insert token (idempotent: UNIQUE(quote_request_id, company_id))
        const { error: insertError } = await admin.from("review_tokens").insert({
          token,
          quote_request_id: lead.id,
          company_id: m.company_id,
          expires_at: expiresAt,
        });
        if (insertError) {
          // Already exists (lead already processed once) — skip.
          continue;
        }
        await sendReviewRequestEmail(
          lead.client_email,
          lead.client_first_name || "",
          m.companies?.name || "votre déménageur",
          token
        );
        result.emailed += 1;
      }

      await admin
        .from("quote_requests")
        .update({ review_email_sent_at: new Date().toISOString() })
        .eq("id", lead.id);
    } catch (err) {
      console.error(`[send-review-emails] Failed for lead ${lead.id}:`, err);
      result.errors += 1;
    }
  }

  return NextResponse.json({ ok: true, ...result });
}
