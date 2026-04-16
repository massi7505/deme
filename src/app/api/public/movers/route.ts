import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { REGIONS, REGION_SLUGS } from "@/lib/utils";

export async function GET(request: NextRequest) {
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
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
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
