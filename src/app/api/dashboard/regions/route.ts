import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json([], { status: 401 });
  }

  const admin = createUntypedAdminClient();

  // Get company
  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json([]);
  }

  // Get regions
  const { data: regions } = await admin
    .from("company_regions")
    .select("*")
    .eq("company_id", company.id)
    .order("department_code");

  // Get radius rules
  const { data: radiusRules } = await admin
    .from("company_radius")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ regions: regions || [], radiusRules: radiusRules || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const { action } = body;

  // ---- Add region (department) ----
  if (action === "add_region") {
    const { department_code, categories } = body;

    // Check trial limit (max 2)
    const { count } = await admin
      .from("company_regions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);

    if ((count || 0) >= 2) {
      return NextResponse.json(
        { error: "Maximum 2 départements pendant la période d'essai" },
        { status: 400 }
      );
    }

    const { data, error } = await admin.from("company_regions").insert({
      company_id: company.id,
      department_code,
      department_name: department_code,
      categories: categories || ["national"],
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  // ---- Remove region ----
  if (action === "remove_region") {
    const { id } = body;

    const { error } = await admin
      .from("company_regions")
      .delete()
      .eq("id", id)
      .eq("company_id", company.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  // ---- Add radius rule ----
  if (action === "add_radius") {
    const { departure_city, lat, lng, radius_km, move_types } = body;

    const { data, error } = await admin.from("company_radius").insert({
      company_id: company.id,
      departure_city,
      lat: lat || 0,
      lng: lng || 0,
      radius_km,
      move_types: move_types || ["national"],
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  // ---- Remove radius rule ----
  if (action === "remove_radius") {
    const { id } = body;

    const { error } = await admin
      .from("company_radius")
      .delete()
      .eq("id", id)
      .eq("company_id", company.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
