import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { sendReconfirmClientEmail } from "@/lib/resend";
import { generateReconfirmToken } from "@/lib/quote-reconfirm-token";
import { startCronRun, finishCronRun } from "@/lib/cron-log";

/**
 * Daily cron. For every quote_requests row where move_date is exactly 3 days
 * from today AND we haven't already emailed the client AND an email is on
 * file AND the client hasn't already reconfirmed/opted out, send the
 * re-engagement email. Marks `reconfirm_email_sent_at` in all cases (success
 * or no-email-on-file) so the same lead isn't re-scanned tomorrow.
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
  const runId = await startCronRun(admin, "reengage-clients");

  const targetDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const stats = { checked: 0, emailed: 0, skippedNoEmail: 0, errors: 0 };

  try {
    const { data, error } = await admin
      .from("quote_requests")
      .select("id, client_email, client_first_name, from_city, to_city")
      .eq("move_date", targetDate)
      .is("reconfirm_email_sent_at", null)
      .is("reconfirmed_at", null)
      .neq("status", "completed")
      .limit(200);

    if (error) {
      await finishCronRun(admin, runId, { success: false, error: error.message, meta: { stats } });
      return NextResponse.json({ error: "query failed" }, { status: 500 });
    }

    const rows = (data || []) as Array<{
      id: string;
      client_email: string | null;
      client_first_name: string | null;
      from_city: string | null;
      to_city: string | null;
    }>;
    stats.checked = rows.length;

    for (const lead of rows) {
      const nowIso = new Date().toISOString();
      if (!lead.client_email) {
        stats.skippedNoEmail += 1;
        await admin
          .from("quote_requests")
          .update({ reconfirm_email_sent_at: nowIso })
          .eq("id", lead.id);
        continue;
      }
      try {
        const yesToken = generateReconfirmToken(lead.id, "yes");
        const noToken = generateReconfirmToken(lead.id, "no");
        await sendReconfirmClientEmail(
          lead.client_email,
          lead.client_first_name || "",
          lead.from_city,
          lead.to_city,
          yesToken,
          noToken
        );
        await admin
          .from("quote_requests")
          .update({ reconfirm_email_sent_at: nowIso })
          .eq("id", lead.id);
        stats.emailed += 1;
      } catch (err) {
        // Leave reconfirm_email_sent_at NULL → retry tomorrow.
        stats.errors += 1;
        console.error("[reengage-clients] email failed for lead", lead.id, (err as Error).message);
      }
    }

    const hadErrors = stats.errors > 0;
    await finishCronRun(admin, runId, {
      success: !hadErrors,
      error: hadErrors ? "one or more email sends failed" : null,
      meta: { stats },
    });
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await finishCronRun(admin, runId, { success: false, error: message, meta: { stats } });
    throw err;
  }
}
