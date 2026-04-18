import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { sendClaimResolvedEmail } from "@/lib/resend";
import { BRAND } from "@/lib/brand";

async function getSiteName(supabase: ReturnType<typeof createUntypedAdminClient>): Promise<string> {
  try {
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).single();
    return (data?.data as Record<string, string>)?.siteName || BRAND.siteName;
  } catch {
    return BRAND.siteName;
  }
}

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

  // Get distribution prices + prospect IDs (via quote_request)
  const distIds = Array.from(new Set(
    (claims || []).map((c: Record<string, unknown>) => c.quote_distribution_id).filter(Boolean)
  ));

  const distMap: Record<string, { price_cents: number; prospect_id: string | null; quote_request_id: string | null }> = {};
  if (distIds.length > 0) {
    const { data: dists } = await supabase
      .from("quote_distributions")
      .select("id, price_cents, quote_request_id")
      .in("id", distIds as string[]);

    if (dists) {
      // Get quote_requests for prospect_id
      const qrIds = Array.from(new Set(
        dists.map((d: Record<string, unknown>) => d.quote_request_id).filter(Boolean)
      ));

      const prospectMap: Record<string, string> = {};
      if (qrIds.length > 0) {
        const { data: qrs } = await supabase
          .from("quote_requests")
          .select("id, prospect_id")
          .in("id", qrIds as string[]);

        if (qrs) {
          for (const q of qrs) {
            prospectMap[q.id] = q.prospect_id;
          }
        }
      }

      for (const d of dists) {
        distMap[d.id] = {
          price_cents: d.price_cents,
          prospect_id: prospectMap[d.quote_request_id] || null,
          quote_request_id: d.quote_request_id,
        };
      }
    }
  }

  const enriched = (claims || []).map((c: Record<string, unknown>) => {
    const dist = distMap[c.quote_distribution_id as string];
    return {
      ...c,
      company_name: companyMap[c.company_id as string]?.name || "Inconnu",
      company_email: companyMap[c.company_id as string]?.email || "",
      amount_cents: dist?.price_cents || 0,
      prospect_id: dist?.prospect_id || null,
      quote_request_id: dist?.quote_request_id || null,
    };
  });

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

    // Send resolution email to mover
    if (["approved", "rejected", "refunded"].includes(body.status)) {
      const { data: claimForEmail } = await supabase.from("claims").select("company_id, reason").eq("id", body.id).single();
      if (claimForEmail) {
        const { data: comp } = await supabase
          .from("companies")
          .select("name, email_contact")
          .eq("id", claimForEmail.company_id)
          .single();
        if (comp?.email_contact) {
          await sendClaimResolvedEmail(
            comp.email_contact,
            comp.name,
            body.status as "approved" | "rejected" | "refunded",
            claimForEmail.reason || "Réclamation"
          ).catch((err) => console.error("Claim resolved email error:", err));
        }
      }
    }

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
        const emailSiteName = await getSiteName(supabase);
        await resend.emails.send({
          from: BRAND.emailFrom || `${emailSiteName} <${BRAND.contactEmail}>`,
          to: body.companyEmail,
          subject: `Réponse à votre réclamation — ${body.reason || "Réclamation"}`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">${emailSiteName}</h1>
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

  // Accept collective defect: refund all unlocked buyers + resolve all claims
  if (body.action === "accept_defect") {
    const quoteRequestId = body.quoteRequestId as string | undefined;
    if (!quoteRequestId) {
      return NextResponse.json({ error: "quoteRequestId requis" }, { status: 400 });
    }

    const { data: dists } = await supabase
      .from("quote_distributions")
      .select("id, company_id, price_cents")
      .eq("quote_request_id", quoteRequestId)
      .eq("status", "unlocked");

    const distributions = (dists || []) as Array<{ id: string; company_id: string; price_cents: number }>;
    if (distributions.length === 0) {
      return NextResponse.json({ error: "Aucune distribution à rembourser" }, { status: 400 });
    }

    let refundedCount = 0;
    for (const d of distributions) {
      const { data: txn } = await supabase
        .from("transactions")
        .select("id, amount_cents")
        .eq("quote_distribution_id", d.id)
        .eq("status", "paid")
        .in("type", ["unlock", "lead_purchase"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const sourceTxn = txn as { id: string; amount_cents: number } | null;
      const refundCents = sourceTxn?.amount_cents || d.price_cents;
      if (refundCents <= 0) continue;

      await supabase.from("wallet_transactions").insert({
        company_id: d.company_id,
        amount_cents: refundCents,
        type: "refund",
        reason: "Lead défectueux confirmé collectivement",
        quote_distribution_id: d.id,
        source_transaction_id: sourceTxn?.id || null,
      });

      if (sourceTxn?.id) {
        await supabase
          .from("transactions")
          .update({ status: "refunded" })
          .eq("id", sourceTxn.id);
      }

      await supabase.from("notifications").insert({
        company_id: d.company_id,
        type: "refund",
        title: "Remboursement automatique",
        body: `Lead défectueux confirmé — ${(refundCents / 100).toFixed(2)} € crédités sur votre portefeuille`,
        data: { quoteRequestId, distributionId: d.id, amountCents: refundCents },
      });

      refundedCount += 1;
    }

    const distIds = distributions.map((d) => d.id);
    await supabase
      .from("claims")
      .update({
        status: "approved",
        admin_note: "Lead défectueux confirmé collectivement",
        resolved_at: new Date().toISOString(),
      })
      .in("quote_distribution_id", distIds)
      .eq("status", "pending");

    await supabase
      .from("quote_requests")
      .update({
        defect_status: "confirmed_refunded",
        defect_resolved_at: new Date().toISOString(),
        defect_resolved_by: "admin",
      })
      .eq("id", quoteRequestId);

    return NextResponse.json({ success: true, refundedCount });
  }

  // Reject collective defect: remove the flag, claims stay pending
  if (body.action === "reject_defect") {
    const quoteRequestId = body.quoteRequestId as string | undefined;
    if (!quoteRequestId) {
      return NextResponse.json({ error: "quoteRequestId requis" }, { status: 400 });
    }

    await supabase
      .from("quote_requests")
      .update({
        defect_status: "rejected",
        defect_resolved_at: new Date().toISOString(),
        defect_resolved_by: "admin",
      })
      .eq("id", quoteRequestId);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
