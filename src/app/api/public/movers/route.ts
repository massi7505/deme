import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { REGIONS, REGION_SLUGS } from "@/lib/utils";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  // Tight rate-limit on the list endpoint: scraping the full mover catalog
  // is the main abuse vector. The detail (slug) endpoint stays more permissive.
  const rl = await checkIpRateLimit(ip, "public/movers", 60, 30);
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
  // Bound pagination so a hostile caller can't request a million-row page.
  const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
  const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;
  const offset = Number.isFinite(rawOffset) ? Math.min(Math.max(rawOffset, 0), 10000) : 0;

  let query = supabase
    .from("companies")
    .select(`
      id, name, slug, city, postal_code, logo_url, description,
      rating, review_count, is_verified, account_status,
      employee_count, legal_status,
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
    return serverError("public/movers:list", error);
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

  // Estimated count uses Postgres table stats, not a full scan — ~1000x
  // cheaper at scale and good enough for a public "X movers" badge. Switching
  // to "exact" was an unnecessary amplification vector for scraping.
  const { count } = await supabase
    .from("companies")
    .select("id", { count: "estimated", head: true })
    .in("account_status", ["active", "trial"]);

  return NextResponse.json({
    movers: filtered,
    total: count || 0,
  });
}
