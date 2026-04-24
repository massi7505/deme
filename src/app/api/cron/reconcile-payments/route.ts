import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { reconcilePendingPayments } from "@/lib/reconcile-payments";
import { startCronRun, finishCronRun } from "@/lib/cron-log";

/**
 * Scheduled via vercel.json. Protected by CRON_SECRET.
 *
 * Vercel's scheduler calls this with `Authorization: Bearer <CRON_SECRET>`.
 * If someone sets a manual GET without the header, refuse.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();
  const runId = await startCronRun(admin, "reconcile-payments");
  try {
    const result = await reconcilePendingPayments(admin);
    await finishCronRun(admin, runId, { success: true, meta: result });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await finishCronRun(admin, runId, { success: false, error: message });
    throw err;
  }
}
