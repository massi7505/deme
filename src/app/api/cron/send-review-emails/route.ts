import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { sendReviewRequestEmail, sendReviewReminderEmail } from "@/lib/resend";
import { startCronRun, finishCronRun } from "@/lib/cron-log";
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
  const runId = await startCronRun(admin, "send-review-emails");
  try {
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

  // ─── Phase 2: REMINDERS (14 days after the initial email, if still unused) ──
  const reminderCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: reminderLeads } = await admin
    .from("quote_requests")
    .select("id, client_email, client_first_name")
    .lte("review_email_sent_at", reminderCutoff)
    .is("review_reminder_sent_at", null)
    .not("client_email", "is", null)
    .limit(50);

  const reminderRows = (reminderLeads || []) as Array<{
    id: string;
    client_email: string;
    client_first_name: string | null;
  }>;

  const reminderResult = { checked: reminderRows.length, emailed: 0, skipped: 0, errors: 0 };

  for (const lead of reminderRows) {
    try {
      // Only send reminder if there's still an unused, non-expired token
      const { data: tokens } = await admin
        .from("review_tokens")
        .select("token, company_id, used_at, expires_at, companies(name)")
        .eq("quote_request_id", lead.id)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString());

      const usableTokens = ((tokens || []) as unknown) as Array<{
        token: string;
        company_id: string;
        companies: { name: string } | null;
      }>;

      if (usableTokens.length === 0) {
        await admin
          .from("quote_requests")
          .update({ review_reminder_sent_at: new Date().toISOString() })
          .eq("id", lead.id);
        reminderResult.skipped += 1;
        continue;
      }

      for (const t of usableTokens) {
        await sendReviewReminderEmail(
          lead.client_email,
          lead.client_first_name || "",
          t.companies?.name || "votre déménageur",
          t.token
        );
        reminderResult.emailed += 1;
      }

      await admin
        .from("quote_requests")
        .update({ review_reminder_sent_at: new Date().toISOString() })
        .eq("id", lead.id);
    } catch (err) {
      console.error(`[send-review-emails] Reminder failed for lead ${lead.id}:`, err);
      reminderResult.errors += 1;
    }
  }

    const hadErrors = result.errors > 0 || reminderResult.errors > 0;
    await finishCronRun(admin, runId, {
      success: !hadErrors,
      error: hadErrors ? "one or more lead emails failed" : null,
      meta: { initial: result, reminders: reminderResult },
    });
    return NextResponse.json({ ok: true, ...result, reminders: reminderResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await finishCronRun(admin, runId, { success: false, error: message });
    throw err;
  }
}
