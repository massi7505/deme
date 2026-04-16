import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("quote_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get distributions per lead
  const leadIds = (data || []).map((d: { id: string }) => d.id);
  const distributionsMap: Record<string, Array<Record<string, unknown>>> = {};

  if (leadIds.length > 0) {
    const { data: distributions } = await supabase
      .from("quote_distributions")
      .select("*, companies(id, name, city)")
      .in("quote_request_id", leadIds);

    if (distributions) {
      for (const d of distributions) {
        if (!distributionsMap[d.quote_request_id]) {
          distributionsMap[d.quote_request_id] = [];
        }
        distributionsMap[d.quote_request_id].push(d);
      }
    }
  }

  // Get all companies for distribution dropdown
  const { data: allCompanies } = await supabase
    .from("companies")
    .select("id, name, city, account_status")
    .in("account_status", ["active", "trial"])
    .order("name");

  const enriched = (data || []).map((lead: Record<string, unknown>) => ({
    ...lead,
    distributions_list: distributionsMap[lead.id as string] || [],
    distributions: (distributionsMap[lead.id as string] || []).length,
    unlocked: (distributionsMap[lead.id as string] || []).filter(
      (d: Record<string, unknown>) => d.status === "unlocked"
    ).length,
  }));

  return NextResponse.json({ leads: enriched, companies: allCompanies || [] });
}

export async function POST(request: NextRequest) {
  const supabase = createUntypedAdminClient();
  const body = await request.json();

  // Distribute lead to a company
  if (body.action === "distribute") {
    const { quoteRequestId, companyId } = body;

    // Check if already distributed to this company
    const { data: existing } = await supabase
      .from("quote_distributions")
      .select("id")
      .eq("quote_request_id", quoteRequestId)
      .eq("company_id", companyId)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Ce lead est déjà distribué à ce déménageur" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("quote_distributions")
      .insert({
        quote_request_id: quoteRequestId,
        company_id: companyId,
        price_cents: body.priceCents || 1200,
        is_trial: false,
        status: "pending",
        competitor_count: 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Remove distribution
  if (body.action === "remove_distribution") {
    const { error } = await supabase
      .from("quote_distributions")
      .delete()
      .eq("id", body.distributionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Delete lead entirely
  if (body.action === "delete") {
    // Delete distributions first
    await supabase
      .from("quote_distributions")
      .delete()
      .eq("quote_request_id", body.id);

    const { error } = await supabase
      .from("quote_requests")
      .delete()
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Update lead status
  if (body.action === "update_status") {
    const { error } = await supabase
      .from("quote_requests")
      .update({ status: body.status })
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
