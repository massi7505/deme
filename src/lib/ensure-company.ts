import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";

type Admin = SupabaseClient;

/**
 * Self-healing company lookup: fetch the company tied to this profile, or
 * create a minimal placeholder if the signup flow left one missing.
 * Always returns a company row so dashboard pages never hard-fail for
 * authenticated movers.
 */
export async function ensureCompanyForUser(
  admin: Admin,
  userId: string,
  email: string
): Promise<Record<string, unknown> | null> {
  const { data: existing } = await admin
    .from("companies")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (existing) return existing;

  // Make sure a profile row exists too (register may have failed silently).
  await admin
    .from("profiles")
    .upsert(
      { id: userId, email, role: "mover" },
      { onConflict: "id", ignoreDuplicates: true }
    );

  const fallbackName = "Mon entreprise";
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const { data: created, error } = await admin
    .from("companies")
    .insert({
      profile_id: userId,
      name: fallbackName,
      slug: slugify(fallbackName) + "-" + suffix,
      siret: "TEMP-" + userId.replace(/-/g, "").slice(0, 13),
      email_contact: email,
      account_status: "trial",
      kyc_status: "pending",
      trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    console.error("[ensureCompanyForUser] insert failed:", error.message);
    return null;
  }

  return created;
}
