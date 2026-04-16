import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { refundPayment } from "@/lib/mollie";

export async function GET() {
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
  try {
    const { action, transactionId } = await request.json();
    const supabase = createUntypedAdminClient();

    if (action === "refund") {
      const { data: txn } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (!txn) {
        return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
      }

      if (txn.status !== "paid") {
        return NextResponse.json({ error: "Seules les transactions payées peuvent être remboursées" }, { status: 400 });
      }

      // Refund via Mollie if we have a payment ID
      if (txn.mollie_payment_id) {
        try {
          await refundPayment(txn.mollie_payment_id, txn.amount_cents, "Remboursement admin");
        } catch (err) {
          console.error("Mollie refund error:", err);
          return NextResponse.json({ error: "Erreur Mollie lors du remboursement" }, { status: 500 });
        }
      }

      // Update transaction status
      await supabase
        .from("transactions")
        .update({ status: "refunded" })
        .eq("id", transactionId);

      // Create refund transaction record
      await supabase.from("transactions").insert({
        company_id: txn.company_id,
        quote_distribution_id: txn.quote_distribution_id,
        mollie_payment_id: txn.mollie_payment_id,
        amount_cents: -txn.amount_cents,
        currency: txn.currency || "EUR",
        type: "refund",
        status: "paid",
      });

      // Revert the lead to pending
      if (txn.quote_distribution_id) {
        await supabase
          .from("quote_distributions")
          .update({ status: "refunded" })
          .eq("id", txn.quote_distribution_id);
      }

      // Notify mover
      await supabase.from("notifications").insert({
        company_id: txn.company_id,
        type: "refund",
        title: "Remboursement effectué",
        body: `Un remboursement de ${(txn.amount_cents / 100).toFixed(2)} € a été effectué sur votre compte.`,
        data: { transactionId },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    console.error("Admin transactions POST error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
