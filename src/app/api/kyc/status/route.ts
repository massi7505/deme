import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("kyc_status")
    .eq("profile_id", user.id)
    .maybeSingle();

  return NextResponse.json({ kyc_status: company?.kyc_status ?? "pending" });
}
