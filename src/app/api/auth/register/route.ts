import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { sendWelcomeEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
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
    const { data: newCompany, error: companyError } = await supabase
      .from("companies")
      .insert({
        profile_id: userId,
        name: companyName,
        slug: slugify(companyName) + "-" + Date.now().toString(36),
        siret: company.siret || "00000000000000",
        address: company.address || null,
        postal_code: company.postalCode || company.postal_code || null,
        city: company.city || null,
        phone: company.phone || null,
        email_contact: email,
        website: company.website || null,
        account_status: "trial",
        trial_ends_at: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
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
