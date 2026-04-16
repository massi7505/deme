import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();

  // Get company
  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json(
      { error: "Aucune entreprise trouvée" },
      { status: 404 }
    );
  }

  // Get active subscription from subscriptions table
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("plan, amount_cents, next_billing_date, status")
    .eq("company_id", company.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get transactions
  const { data: transactions, error } = await admin
    .from("transactions")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate monthly summary — only count PAID, deduplicate per lead
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonthPaid = (transactions || []).filter(
    (t: Record<string, unknown>) =>
      t.status === "paid" &&
      (t.created_at as string) >= firstOfMonth &&
      (t.amount_cents as number) > 0 // exclude refund credits
  );

  const subscriptionTotal = thisMonthPaid
    .filter((t: Record<string, unknown>) => t.type === "subscription")
    .reduce((sum: number, t: Record<string, unknown>) => sum + ((t.amount_cents as number) || 0), 0);

  // Deduplicate lead purchases: only count one paid transaction per distribution
  const seenDistributions = new Set<string>();
  let unlockTotal = 0;
  for (const t of thisMonthPaid) {
    if (t.type !== "unlock" && t.type !== "lead_purchase") continue;
    const distId = t.quote_distribution_id as string;
    if (distId && seenDistributions.has(distId)) continue; // skip duplicate
    if (distId) seenDistributions.add(distId);
    unlockTotal += (t.amount_cents as number) || 0;
  }

  // Build full invoice URLs server-side
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const enrichedTransactions = (transactions || []).map((t: Record<string, unknown>) => ({
    ...t,
    invoice_full_url: t.invoice_url
      ? `${supabaseUrl}/storage/v1/object/public/invoices/${t.invoice_url}`
      : null,
  }));

  return NextResponse.json({
    plan: {
      name: subscription?.plan || "Aucun",
      priceCents: subscription?.amount_cents || 0,
      nextBilling: subscription?.next_billing_date || null,
    },
    transactions: enrichedTransactions,
    summary: {
      totalCents: subscriptionTotal + unlockTotal,
      subscriptionCents: subscriptionTotal,
      unlockCents: unlockTotal,
    },
  });
}
