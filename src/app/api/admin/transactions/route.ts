import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { createRefund, type RefundMethod } from "@/lib/wallet";
import { sendRefundEmail, sendWalletRefundEmail } from "@/lib/resend";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const supabase = createUntypedAdminClient();

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin transactions fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json([]);
    }

    // Get company info
    const companyIds = Array.from(new Set(
      transactions.map((t: Record<string, unknown>) => t.company_id).filter(Boolean)
    ));

    const companyMap: Record<string, Record<string, unknown>> = {};
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, email_contact, email_billing, phone, city")
        .in("id", companyIds as string[]);

      if (companies) {
        for (const c of companies) {
          companyMap[c.id] = c;
        }
      }
    }

    // Get quote distribution + request info for lead details
    const distIds = Array.from(new Set(
      transactions
        .map((t: Record<string, unknown>) => t.quote_distribution_id)
        .filter(Boolean)
    ));

    const leadMap: Record<string, Record<string, unknown>> = {};
    if (distIds.length > 0) {
      const { data: distributions } = await supabase
        .from("quote_distributions")
        .select("id, quote_request_id, price_cents, status")
        .in("id", distIds as string[]);

      if (distributions) {
        const quoteIds = distributions.map((d: Record<string, unknown>) => d.quote_request_id).filter(Boolean);
        const quoteMap: Record<string, Record<string, unknown>> = {};

        if (quoteIds.length > 0) {
          const { data: quotes } = await supabase
            .from("quote_requests")
            .select("id, prospect_id, client_name, client_phone, client_email, from_city, to_city, category, move_date")
            .in("id", quoteIds as string[]);

          if (quotes) {
            for (const q of quotes) {
              quoteMap[q.id] = q;
            }
          }
        }

        for (const d of distributions) {
          const quote = quoteMap[d.quote_request_id as string] || {};
          leadMap[d.id] = { ...d, ...quote };
        }
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const enriched = transactions.map((t: Record<string, unknown>) => {
      const company = companyMap[t.company_id as string] || {};
      const lead = leadMap[t.quote_distribution_id as string] || {};

      return {
        ...t,
        company_name: company.name || "Inconnu",
        company_email: company.email_contact || company.email_billing || null,
        company_phone: company.phone || null,
        company_city: company.city || null,
        lead_prospect_id: lead.prospect_id || null,
        lead_client_name: lead.client_name || null,
        lead_client_phone: lead.client_phone || null,
        lead_client_email: lead.client_email || null,
        lead_from_city: lead.from_city || null,
        lead_to_city: lead.to_city || null,
        lead_category: lead.category || null,
        lead_move_date: lead.move_date || null,
        lead_status: lead.status || null,
        invoice_full_url: t.invoice_url
          ? `${supabaseUrl}/storage/v1/object/public/invoices/${t.invoice_url}`
          : null,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("Admin transactions error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const action = body.action as string;
    const supabase = createUntypedAdminClient();

    // Unified refund entry — replaces the old bank-only refund path.
    // Body: { action: "refund", transactionId, amountCents, method, reason, adminNote? }
    if (action === "refund") {
      const {
        transactionId,
        amountCents,
        method = "wallet",
        reason,
        adminNote,
      } = body as {
        transactionId?: string;
        amountCents?: number;
        method?: RefundMethod;
        reason?: string;
        adminNote?: string;
      };

      if (!transactionId) {
        return NextResponse.json({ error: "transactionId requis" }, { status: 400 });
      }
      if (!amountCents || amountCents <= 0) {
        return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
      }
      if (method !== "wallet" && method !== "bank") {
        return NextResponse.json({ error: "Méthode invalide" }, { status: 400 });
      }

      try {
        const result = await createRefund(supabase, {
          sourceTransactionId: transactionId,
          amountCents: Math.round(amountCents),
          method,
          reason: (reason || "Geste commercial").trim(),
          adminNote: adminNote || null,
        });

        // Email — different template per method
        const emailTo = result.company.email_contact;
        if (emailTo) {
          if (method === "wallet" && result.expiresAt) {
            await sendWalletRefundEmail(
              emailTo,
              result.company.name,
              result.amountCents,
              result.expiresAt,
              result.newBalance
            ).catch((err) => console.error("[refund] wallet email error:", err));
          } else if (method === "bank") {
            await sendRefundEmail(
              emailTo,
              result.company.name,
              result.amountCents
            ).catch((err) => console.error("[refund] bank email error:", err));
          }
        }

        return NextResponse.json({
          success: true,
          method: result.method,
          amountCents: result.amountCents,
          percent: result.percent,
          newBalance: result.newBalance,
        });
      } catch (err) {
        const msg = (err as Error).message;
        console.error("[refund] createRefund failed:", msg);
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    console.error("Admin transactions POST error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
