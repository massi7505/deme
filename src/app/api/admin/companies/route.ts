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

  // Reset KYC to pending and clear the didit session id. The mover can then
  // start a fresh verification from /verification-identite.
  if (body.action === "reset_kyc") {
    const { error } = await supabase
      .from("companies")
      .update({
        kyc_status: "pending",
        didit_session_id: null,
        is_verified: false,
      })
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

  // Update an arbitrary editable field on a company
  if (body.action === "update_field") {
    const ALLOWED = new Set([
      "name",
      "siret",
      "vat_number",
      "legal_status",
      "employee_count",
      "address",
      "city",
      "postal_code",
      "phone",
      "email_contact",
      "email_billing",
      "website",
      "description",
    ]);
    const field = (body.field || "").toString();
    if (!ALLOWED.has(field)) {
      return NextResponse.json(
        { error: `Champ '${field}' non modifiable` },
        { status: 400 }
      );
    }
    let value: unknown = body.value;
    if (field === "employee_count") {
      const parsed = parseInt(String(value), 10);
      value = Number.isFinite(parsed) ? parsed : null;
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      value = trimmed === "" ? null : trimmed;
    }
    const { error } = await supabase
      .from("companies")
      .update({ [field]: value })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Delete company (full purge: DB + storage + auth user)
  if (body.action === "delete") {
    const { data: target } = await supabase
      .from("companies")
      .select("id, name, profile_id")
      .eq("id", body.id)
      .single();

    if (!target) {
      return NextResponse.json(
        { error: "Entreprise introuvable" },
        { status: 404 }
      );
    }

    // Require exact name match to prevent accidental deletion
    const typed = (body.confirmName || "").toString().trim();
    if (typed !== (target.name || "").trim()) {
      return NextResponse.json(
        { error: "Le nom saisi ne correspond pas au nom de l'entreprise" },
        { status: 400 }
      );
    }

    const companyId = target.id as string;
    const profileId = target.profile_id as string | null;

    // Storage cleanup — list + remove everything under {companyId}/
    const purgeBucket = async (bucket: string) => {
      try {
        const { data: folders } = await supabase.storage
          .from(bucket)
          .list(companyId, { limit: 1000 });
        const paths: string[] = [];
        for (const entry of folders || []) {
          if (entry.name === ".emptyFolderPlaceholder") continue;
          // Files directly under {companyId}/
          paths.push(`${companyId}/${entry.name}`);
          // Subfolders (logos/, photos/) — list their contents too
          const { data: sub } = await supabase.storage
            .from(bucket)
            .list(`${companyId}/${entry.name}`, { limit: 1000 });
          if (sub && sub.length > 0) {
            for (const f of sub) {
              if (f.name === ".emptyFolderPlaceholder") continue;
              paths.push(`${companyId}/${entry.name}/${f.name}`);
            }
          }
        }
        if (paths.length > 0) {
          await supabase.storage.from(bucket).remove(paths);
        }
      } catch (err) {
        console.error(`[delete] storage purge failed for ${bucket}:`, err);
      }
    };

    await purgeBucket("company-assets");
    await purgeBucket("invoices");

    // Child tables — order matters only if FKs have no cascade.
    // We clear everything by company_id to be safe.
    await supabase.from("quote_distributions").delete().eq("company_id", companyId);
    await supabase.from("transactions").delete().eq("company_id", companyId);
    await supabase.from("subscriptions").delete().eq("company_id", companyId);
    await supabase.from("reviews").delete().eq("company_id", companyId);
    await supabase.from("claims").delete().eq("company_id", companyId);
    await supabase.from("company_regions").delete().eq("company_id", companyId);
    await supabase.from("company_radius").delete().eq("company_id", companyId);
    await supabase.from("company_photos").delete().eq("company_id", companyId);
    await supabase.from("company_qna").delete().eq("company_id", companyId);
    await supabase.from("notifications").delete().eq("company_id", companyId);

    const { error: companyDeleteError } = await supabase
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (companyDeleteError) {
      return NextResponse.json(
        { error: companyDeleteError.message },
        { status: 500 }
      );
    }

    // Profile + auth user — only if this profile has no other companies
    if (profileId) {
      const { count: remaining } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId);

      if (!remaining) {
        await supabase.from("profiles").delete().eq("id", profileId);
        await supabase.auth.admin.deleteUser(profileId).catch((err) =>
          console.error("[delete] auth.admin.deleteUser failed:", err)
        );
      }
    }

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
