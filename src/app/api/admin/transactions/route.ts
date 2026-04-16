import { NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createUntypedAdminClient();

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get company names for all transactions
  const companyIds = Array.from(new Set(
    (transactions || [])
      .map((t: Record<string, unknown>) => t.company_id)
      .filter(Boolean)
  ));

  const companyMap: Record<string, string> = {};

  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds as string[]);

    if (companies) {
      for (const c of companies) {
        companyMap[c.id] = c.name;
      }
    }
  }

  const enriched = (transactions || []).map((t: Record<string, unknown>) => ({
    ...t,
    company_name: companyMap[t.company_id as string] || "Inconnu",
  }));

  return NextResponse.json(enriched);
}
