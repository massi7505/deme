import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";
import { slugify } from "@/lib/utils";
import { sendWelcomeEmail } from "@/lib/resend";
import { backfillLeadsForCompany } from "@/lib/backfill-leads";

export async function POST(request: NextRequest) {
  try {
    const ipCheck = await checkIpRateLimit(getClientIp(request), "auth-register", 3600, 3);
    if (!ipCheck.ok) {
      return NextResponse.json(
        { error: "Trop de créations de compte. Merci de réessayer plus tard.", retryAfterSec: ipCheck.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSec ?? 60) } }
      );
    }
    const body = await request.json();
    const supabase = createUntypedAdminClient();

    const {
      email,
      password,
      types = ["national"],
      departments = [],
      company = {},
      contact = {},
    } = body;

    // 1. Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm for now
      });

    if (authError) {
      const message =
        authError.message === "User already registered"
          ? "Un compte existe déjà avec cet email"
          : authError.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Erreur lors de la création du compte" },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 2. Create profile
    const fullName =
      `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      role: "mover",
      email,
      phone: company.phone || null,
      full_name: fullName || null,
    });

    if (profileError) {
      console.error("Profile insert error:", profileError);
    }

    // 3. Create company
    const companyName =
      company.companyName || company.name || "Mon entreprise";
    const fallbackSiret = "TEMP-" + userId.replace(/-/g, "").slice(0, 13);
    const { data: newCompany, error: companyError } = await supabase
      .from("companies")
      .insert({
        profile_id: userId,
        name: companyName,
        slug: slugify(companyName) + "-" + Date.now().toString(36),
        siret: company.siret || fallbackSiret,
        address: company.address || null,
        postal_code: company.postalCode || company.postal_code || null,
        city: company.city || null,
        phone: company.phone || null,
        email_contact: email,
        website: company.website || null,
        account_status: "pending",
        trial_ends_at: null,
      })
      .select("id")
      .single();

    if (companyError) {
      console.error("Company insert error:", companyError);
    }

    // 4. Create company_regions
    if (newCompany && departments.length > 0) {
      const regions = departments.map((dept: string) => ({
        company_id: newCompany.id,
        department_code: dept,
        department_name: dept,
        categories: types,
      }));
      await supabase.from("company_regions").insert(regions);

      // 5. Seed matching recent leads so the new mover sees demand immediately.
      await backfillLeadsForCompany(supabase, newCompany.id).catch((err) =>
        console.error("[register] backfill error:", err)
      );
    }

    // Send welcome email
    await sendWelcomeEmail(email, companyName).catch((err) =>
      console.error("Welcome email error:", err)
    );

    return NextResponse.json({
      success: true,
      userId,
      companyId: newCompany?.id || null,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
