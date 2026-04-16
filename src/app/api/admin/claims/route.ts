import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createUntypedAdminClient();

  const { data: claims, error } = await supabase
    .from("claims")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get company names + emails
  const companyIds = Array.from(new Set(
    (claims || []).map((c: Record<string, unknown>) => c.company_id).filter(Boolean)
  ));

  const companyMap: Record<string, { name: string; email: string }> = {};

  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, email_contact")
      .in("id", companyIds as string[]);

    if (companies) {
      for (const c of companies) {
        companyMap[c.id] = { name: c.name, email: c.email_contact || "" };
      }
    }
  }

  // Get distribution prices
  const distIds = Array.from(new Set(
    (claims || []).map((c: Record<string, unknown>) => c.quote_distribution_id).filter(Boolean)
  ));

  const distMap: Record<string, number> = {};
  if (distIds.length > 0) {
    const { data: dists } = await supabase
      .from("quote_distributions")
      .select("id, price_cents")
      .in("id", distIds as string[]);

    if (dists) {
      for (const d of dists) {
        distMap[d.id] = d.price_cents;
      }
    }
  }

  const enriched = (claims || []).map((c: Record<string, unknown>) => ({
    ...c,
    company_name: companyMap[c.company_id as string]?.name || "Inconnu",
    company_email: companyMap[c.company_id as string]?.email || "",
    amount_cents: distMap[c.quote_distribution_id as string] || 0,
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const supabase = createUntypedAdminClient();
  const body = await request.json();

  // Update status
  if (body.action === "update_status") {
    const updates: Record<string, unknown> = { status: body.status };
    if (["approved", "rejected", "refunded"].includes(body.status)) {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("claims")
      .update(updates)
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If refunded, create refund transaction + update distribution
    if (body.status === "refunded") {
      const { data: claim } = await supabase.from("claims").select("*").eq("id", body.id).single();
      if (claim) {
        const { data: dist } = await supabase
          .from("quote_distributions")
          .select("price_cents")
          .eq("id", claim.quote_distribution_id)
          .single();

        await supabase.from("transactions").insert({
          company_id: claim.company_id,
          quote_distribution_id: claim.quote_distribution_id,
          amount_cents: dist?.price_cents || 1200,
          type: "refund",
          status: "refunded",
        });

        await supabase
          .from("quote_distributions")
          .update({ status: "refunded" })
          .eq("id", claim.quote_distribution_id);
      }
    }

    return NextResponse.json({ success: true });
  }

  // Add admin reply
  if (body.action === "reply") {
    const { data: claim } = await supabase
      .from("claims")
      .select("admin_note")
      .eq("id", body.id)
      .single();

    if (!claim) return NextResponse.json({ error: "Réclamation introuvable" }, { status: 404 });

    // Append message to admin_note as JSON conversation
    let conversation: Array<{ from: string; message: string; date: string }> = [];
    try {
      conversation = claim.admin_note ? JSON.parse(claim.admin_note) : [];
    } catch {
      // If admin_note is plain text, convert it
      if (claim.admin_note) {
        conversation = [{ from: "admin", message: claim.admin_note, date: new Date().toISOString() }];
      }
    }

    conversation.push({
      from: "admin",
      message: body.message,
      date: new Date().toISOString(),
    });

    const { error } = await supabase
      .from("claims")
      .update({ admin_note: JSON.stringify(conversation) })
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send email notification to the mover
    if (body.sendEmail && body.companyEmail) {
      try {
        const { getResend } = await import("@/lib/resend");
        const resend = getResend();
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "Demenagement24 <noreply@demenagement24.com>",
          to: body.companyEmail,
          subject: `Réponse à votre réclamation — ${body.reason || "Réclamation"}`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Demenagement24</h1>
              </div>
              <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <h2 style="margin-top: 0; font-size: 18px;">Réponse à votre réclamation</h2>
                <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0; white-space: pre-wrap;">${body.message}</p>
                </div>
                <p style="color: #6b7280; font-size: 14px;">Connectez-vous à votre espace pour suivre l'état de votre réclamation.</p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
        // Don't fail the reply if email fails
      }
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
