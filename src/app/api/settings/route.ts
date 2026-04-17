import { NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { BRAND } from "@/lib/brand";

const DEFAULTS = {
  siteName: BRAND.siteName,
  siteUrl: BRAND.siteUrl,
  contactEmail: BRAND.contactEmail,
  contactPhone: BRAND.contactPhone,
  contactAddress: "",
};

export async function GET() {
  try {
    const supabase = createUntypedAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("data")
      .eq("id", 1)
      .single();

    const saved = data?.data || {};

    return NextResponse.json({
      siteName: saved.siteName || DEFAULTS.siteName,
      siteUrl: saved.siteUrl || DEFAULTS.siteUrl,
      contactEmail: saved.contactEmail || DEFAULTS.contactEmail,
      contactPhone: saved.contactPhone || DEFAULTS.contactPhone,
      contactAddress: saved.contactAddress || DEFAULTS.contactAddress,
    });
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}
