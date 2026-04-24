import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { getWalletBalanceCents } from "@/lib/wallet";
import { sendWalletExpiryWarningEmail } from "@/lib/resend";
import { startCronRun, finishCronRun } from "@/lib/cron-log";

type Threshold = 7 | 30;

interface CreditRow {
  id: string;
  company_id: string;
  amount_cents: number;
  expires_at: string;
}

interface PassStats {
  threshold: Threshold;
  rowsFound: number;
  movers: number;
  emailsSent: number;
  skippedNoEmail: number;
  skippedNoBalance: number;
  errors: number;
}

/**
 * Daily cron. For each of the two disjoint windows (]0, 7d] and ]7d, 30d]),
 * finds positive wallet refund credits not yet warned at that threshold,
 * groups them per company, and sends one aggregated email per company.
 *
 * Marking rules:
 * - On successful send → mark all rows in the group with warned_at_<N>d = now().
 * - No email on file → mark as warned (stops the row from re-scanning forever).
 * - Balance ≤ 0 → DO NOT mark. If balance recovers before the expiry day, the
 *   warning fires on a later run.
 * - Resend error → DO NOT mark. Next day's run retries.
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
  const runId = await startCronRun(admin, "warn-wallet-expiry");
  const stats: PassStats[] = [];

  try {
    // J-7 first, then J-30. Order is cosmetic — the windows are disjoint so
    // the same row can never match both in the same run.
    for (const threshold of [7, 30] as const) {
      stats.push(await runPass(admin, threshold));
    }
    const hadErrors = stats.some((s) => s.errors > 0);
    await finishCronRun(admin, runId, {
      success: !hadErrors,
      error: hadErrors ? "one or more passes logged errors" : null,
      meta: { stats },
    });
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await finishCronRun(admin, runId, { success: false, error: message, meta: { stats } });
    throw err;
  }
}

async function runPass(
  admin: ReturnType<typeof createUntypedAdminClient>,
  threshold: Threshold
): Promise<PassStats> {
  const stats: PassStats = {
    threshold,
    rowsFound: 0,
    movers: 0,
    emailsSent: 0,
    skippedNoEmail: 0,
    skippedNoBalance: 0,
    errors: 0,
  };

  const now = new Date();
  const upper = new Date(now.getTime() + threshold * 24 * 60 * 60 * 1000).toISOString();
  // Lower bound:
  //   J-7 pass  → expires_at > now  (include everything down to the wire)
  //   J-30 pass → expires_at > now + 7d  (exclude the J-7 band)
  const lower =
    threshold === 30
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : now.toISOString();

  const warnedColumn = threshold === 7 ? "warned_at_7d" : "warned_at_30d";

  const { data, error } = await admin
    .from("wallet_transactions")
    .select("id, company_id, amount_cents, expires_at")
    .eq("type", "refund")
    .eq("refund_method", "wallet")
    .gt("amount_cents", 0)
    .gt("expires_at", lower)
    .lte("expires_at", upper)
    .is(warnedColumn, null);

  if (error) {
    console.error("[warn-wallet-expiry] query error:", error.message);
    stats.errors += 1;
    return stats;
  }

  const rows = (data || []) as CreditRow[];
  stats.rowsFound = rows.length;
  if (rows.length === 0) return stats;

  const byCompany = new Map<string, CreditRow[]>();
  for (const r of rows) {
    const list = byCompany.get(r.company_id) || [];
    list.push(r);
    byCompany.set(r.company_id, list);
  }
  stats.movers = byCompany.size;

  for (const [companyId, group] of Array.from(byCompany)) {
    const balance = await getWalletBalanceCents(admin, companyId);
    if (balance <= 0) {
      // Skip WITHOUT marking — balance may recover before expiry.
      stats.skippedNoBalance += 1;
      continue;
    }

    const { data: company } = await admin
      .from("companies")
      .select("name, email_contact")
      .eq("id", companyId)
      .maybeSingle();

    const companyInfo = company as { name: string; email_contact: string | null } | null;

    const ids = group.map((r: CreditRow) => r.id);

    if (!companyInfo?.email_contact) {
      // Mark as warned so we don't re-scan this row daily with no hope of sending.
      stats.skippedNoEmail += 1;
      await admin
        .from("wallet_transactions")
        .update({ [warnedColumn]: now.toISOString() })
        .in("id", ids);
      continue;
    }

    try {
      await sendWalletExpiryWarningEmail(
        companyInfo.email_contact,
        companyInfo.name,
        threshold,
        group.map((r: CreditRow) => ({ amountCents: r.amount_cents, expiresAt: r.expires_at }))
      );
      await admin
        .from("wallet_transactions")
        .update({ [warnedColumn]: now.toISOString() })
        .in("id", ids);
      stats.emailsSent += 1;
    } catch (err) {
      // DO NOT mark — retry tomorrow.
      stats.errors += 1;
      console.error(
        "[warn-wallet-expiry] email failed for company",
        companyId,
        (err as Error).message
      );
    }
  }

  return stats;
}
