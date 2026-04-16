import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("companies")
    .select(`
      *,
      profiles(id, email, full_name, phone),
      company_regions(id, department_code, department_name, categories),
      quote_distributions(id, status, price_cents, created_at, quote_requests(id, prospect_id, from_city, to_city, client_name))
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const supabase = createUntypedAdminClient();
  const body = await request.json();

  // Update company status
  if (body.action === "update_status") {
    const { error } = await supabase
      .from("companies")
      .update({ account_status: body.status })
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Update KYC status
  if (body.action === "update_kyc") {
    const updates: Record<string, unknown> = { kyc_status: body.kyc_status };
    if (body.kyc_status === "approved") {
      updates.is_verified = true;
      updates.account_status = "active";
    }
    const { error } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Suspend company
  if (body.action === "suspend") {
    const { error } = await supabase
      .from("companies")
      .update({ account_status: "suspended" })
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Reactivate company
  if (body.action === "reactivate") {
    const { error } = await supabase
      .from("companies")
      .update({ account_status: "active" })
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Delete company
  if (body.action === "delete") {
    // Delete regions + radius first
    await supabase.from("company_regions").delete().eq("company_id", body.id);
    await supabase.from("company_radius").delete().eq("company_id", body.id);
    await supabase.from("company_photos").delete().eq("company_id", body.id);
    await supabase.from("company_qna").delete().eq("company_id", body.id);
    await supabase.from("notifications").delete().eq("company_id", body.id);

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Delete a region
  if (body.action === "delete_region") {
    const { error } = await supabase
      .from("company_regions")
      .delete()
      .eq("id", body.regionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
