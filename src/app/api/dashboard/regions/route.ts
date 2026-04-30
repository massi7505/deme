import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { REGIONS } from "@/lib/utils";
import { serverError } from "@/lib/api-errors";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

const VALID_DEPT_CODES = new Set<string>(Object.values(REGIONS).flat());
const VALID_CATEGORIES = new Set(["national", "entreprise", "international"]);

function sanitizeCategories(input: unknown): string[] {
  if (!Array.isArray(input)) return ["national"];
  const clean = input.filter(
    (v): v is string => typeof v === "string" && VALID_CATEGORIES.has(v)
  );
  return clean.length > 0 ? Array.from(new Set(clean)) : ["national"];
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rl = await checkIpRateLimit(`${getClientIp(request)}:${user.id}`, "dashboard/regions", 60, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
    );
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
    .select("id, account_status")
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

    if (typeof department_code !== "string" || !VALID_DEPT_CODES.has(department_code)) {
      return NextResponse.json({ error: "Code département invalide" }, { status: 400 });
    }

    const { data, error } = await admin.from("company_regions").insert({
      company_id: company.id,
      department_code,
      department_name: department_code,
      categories: sanitizeCategories(categories),
    }).select().single();

    if (error) {
      return serverError("dashboard/regions:add_region", error);
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
      return serverError("dashboard/regions:remove_region", error);
    }

    return NextResponse.json({ success: true });
  }

  // ---- Add radius rule ----
  if (action === "add_radius") {
    const { departure_city, lat, lng, radius_km, move_types } = body;

    const city = typeof departure_city === "string" ? departure_city.trim().slice(0, 100) : "";
    if (!city) {
      return NextResponse.json({ error: "Ville de départ requise" }, { status: 400 });
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const radiusNum = Number(radius_km);
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      return NextResponse.json({ error: "Latitude invalide" }, { status: 400 });
    }
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      return NextResponse.json({ error: "Longitude invalide" }, { status: 400 });
    }
    if (!Number.isFinite(radiusNum) || radiusNum <= 0 || radiusNum > 2000) {
      return NextResponse.json({ error: "Rayon invalide (1-2000 km)" }, { status: 400 });
    }

    const { data, error } = await admin.from("company_radius").insert({
      company_id: company.id,
      departure_city: city,
      lat: latNum,
      lng: lngNum,
      radius_km: radiusNum,
      move_types: sanitizeCategories(move_types),
    }).select().single();

    if (error) {
      return serverError("dashboard/regions:add_radius", error);
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
      return serverError("dashboard/regions:remove_radius", error);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
