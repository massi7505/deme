import { NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

/**
 * Health check for database migrations. Returns which critical tables /
 * columns are in place so /admin/setup can show green/red indicators.
 */
export async function GET() {
  const admin = createUntypedAdminClient();

  async function tableExists(name: string): Promise<boolean> {
    const { error } = await admin.from(name).select("*", { head: true, count: "exact" }).limit(0);
    return !error;
  }

  const checks = {
    wallet_transactions: await tableExists("wallet_transactions"),
    companies: await tableExists("companies"),
    transactions: await tableExists("transactions"),
  };

  let supabaseSqlUrl: string | null = null;
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    const projectRef = url.hostname.split(".")[0];
    if (projectRef) {
      supabaseSqlUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
    }
  } catch {
    /* ignore */
  }

  const ready = checks.wallet_transactions;

  return NextResponse.json({ ready, checks, supabaseSqlUrl });
}
