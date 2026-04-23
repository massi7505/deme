import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { REGIONS, REGION_SLUGS } from "@/lib/utils";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkIpRateLimit(ip, "public/movers", 60, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
    );
  }

  const supabase = createUntypedAdminClient();
  const { searchParams } = request.nextUrl;

  const regionSlug = searchParams.get("region");
  const department = searchParams.get("department");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "rating";
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("companies")
    .select(`
      id, name, slug, city, postal_code, logo_url, description,
      rating, review_count, is_verified, account_status,
      employee_count, legal_status, siret,
      company_regions(department_code, department_name, categories)
    `)
    .in("account_status", ["active", "trial"])
    .range(offset, offset + limit - 1);

  if (sort === "rating") {
    query = query.order("rating", { ascending: false });
  } else if (sort === "reviews") {
    query = query.order("review_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (search) {
    // Strip PostgREST filter delimiters (,()\) + % so user input can't break
    // out of the .or() grammar and inject extra filters. Keep letters (incl.
    // accents), digits, space, hyphen, apostrophe — enough for FR company +
    // city names. Cap length so huge strings can't blow up the query.
    const safe = search.replace(/[^a-zA-Z0-9À-ÖØ-öø-ÿ\s'-]/g, "").slice(0, 80);
    if (safe) {
      query = query.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by region slug or specific department
  let filtered = data || [];

  // Resolve region slug → department codes
  const regionName = regionSlug ? REGION_SLUGS[regionSlug] : null;
  const regionDepts = regionName ? REGIONS[regionName] : null;

  if (regionDepts) {
    const deptFilter = department || null;
    filtered = filtered.filter((c: Record<string, unknown>) => {
      const companyRegions = c.company_regions as Array<{ department_code: string }>;
      if (!companyRegions?.length) return false;
      if (deptFilter) {
        return companyRegions.some((r) => r.department_code === deptFilter);
      }
      return companyRegions.some((r) => regionDepts.includes(r.department_code));
    });
  } else if (department) {
    filtered = filtered.filter((c: Record<string, unknown>) => {
      const companyRegions = c.company_regions as Array<{ department_code: string }>;
      return companyRegions?.some((r) => r.department_code === department);
    });
  }

  // Get total count
  const { count } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .in("account_status", ["active", "trial"]);

  return NextResponse.json({
    movers: filtered,
    total: count || 0,
  });
}
