import { NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Lightweight counts endpoint for admin-side moderation badges.
 * Intentionally public-readable: the numbers themselves reveal no PII
 * and the admin sidebar polls this without a token round-trip.
 */
export async function GET() {
  const supabase = createUntypedAdminClient();

  const [{ count: pendingPhotos }, { count: pendingLeadReviews }] = await Promise.all([
    supabase
      .from("company_photos")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "review_pending"),
  ]);

  return NextResponse.json({
    pendingPhotos: pendingPhotos ?? 0,
    pendingLeadReviews: pendingLeadReviews ?? 0,
  });
}
