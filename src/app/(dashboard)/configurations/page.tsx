import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { ConfigurationsView } from "@/components/dashboard/ConfigurationsView";

export const dynamic = "force-dynamic";

interface Region {
  id: string;
  department_code: string;
  department_name: string;
  categories: string[];
}

interface RadiusRule {
  id: string;
  departure_city: string;
  lat: number;
  lng: number;
  radius_km: number;
  move_types: string[];
}

export default async function ConfigurationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const admin = createUntypedAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!company) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Régions ciblées et catégories</h2>
        <p className="text-sm text-muted-foreground">
          Aucune entreprise associée à votre compte. Complétez votre inscription.
        </p>
      </div>
    );
  }

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [regionsRes, radiusRulesRes, impactRes] = await Promise.allSettled([
    admin
      .from("company_regions")
      .select("id, department_code, department_name, categories")
      .eq("company_id", company.id)
      .order("department_code"),
    admin
      .from("company_radius")
      .select("id, departure_city, lat, lng, radius_km, move_types")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
    admin
      .from("quote_distributions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .gte("created_at", since),
  ]);

  const regions =
    regionsRes.status === "fulfilled" ? ((regionsRes.value.data || []) as Region[]) : [];
  const radiusRules =
    radiusRulesRes.status === "fulfilled"
      ? ((radiusRulesRes.value.data || []) as RadiusRule[])
      : [];
  const impactCount =
    impactRes.status === "fulfilled" ? impactRes.value.count ?? 0 : 0;

  return (
    <ConfigurationsView
      regions={regions}
      radiusRules={radiusRules}
      impactCount={impactCount}
    />
  );
}
