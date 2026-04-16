import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { generateInvoiceNumber } from "@/lib/utils";

// Note: In production, use pdfkit or @react-pdf/renderer for real PDF generation.
// This module generates a simple HTML invoice and stores it as a PDF placeholder.

export interface InvoiceData {
  transactionId: string;
  companyId: string;
  companyName: string;
  companySiret: string;
  companyAddress: string;
  companyCity: string;
  companyPostalCode: string;
  description: string;
  amountCents: number;
  vatRate?: number; // 0.20 for 20% TVA
}

export async function generateInvoice(data: InvoiceData) {
  const invoiceNumber = generateInvoiceNumber();
  const supabase = createUntypedAdminClient();

  const amountHT = data.amountCents;
  const vatRate = data.vatRate ?? 0.2;
  const vatAmount = Math.round(amountHT * vatRate);
  const amountTTC = amountHT + vatAmount;

  const invoiceHtml = buildInvoiceHtml({
    ...data,
    invoiceNumber,
    amountHT,
    vatAmount,
    amountTTC,
    vatRate,
    date: new Date().toLocaleDateString("fr-FR"),
  });

  // Store as HTML file (in production, convert to PDF with puppeteer or pdfkit)
  const fileName = `${data.companyId}/${invoiceNumber}.html`;
  const { data: uploadData, error } = await supabase.storage
    .from("invoices")
    .upload(fileName, invoiceHtml, {
      contentType: "text/html",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload invoice: ${error.message}`);
  }

  // Update transaction with invoice info
  await supabase
    .from("transactions")
    .update({
      invoice_number: invoiceNumber,
      invoice_url: uploadData.path,
    })
    .eq("id", data.transactionId);

  return { invoiceNumber, path: uploadData.path };
}

function buildInvoiceHtml(data: {
  invoiceNumber: string;
  companyName: string;
  companySiret: string;
  companyAddress: string;
  companyCity: string;
  companyPostalCode: string;
  description: string;
  amountHT: number;
  vatAmount: number;
  amountTTC: number;
  vatRate: number;
  date: string;
}) {
  const fmt = (cents: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${data.invoiceNumber}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; color: #1f2937; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: 800; }
    .logo span { color: #22c55e; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .total { font-weight: 700; font-size: 18px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Demenagement<span>24</span></div>
      <p>Paris, France<br>contact@demenagement24.com</p>
    </div>
    <div style="text-align: right;">
      <h1 style="margin: 0; font-size: 28px;">FACTURE</h1>
      <p><strong>${data.invoiceNumber}</strong><br>Date : ${data.date}</p>
    </div>
  </div>

  <div style="margin-bottom: 32px;">
    <strong>Facturé à :</strong><br>
    ${data.companyName}<br>
    ${data.companyAddress}<br>
    ${data.companyPostalCode} ${data.companyCity}<br>
    SIRET : ${data.companySiret}
  </div>

  <table>
    <thead>
      <tr>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Prix HT</th>
        <th>TVA (${Math.round(data.vatRate * 100)}%)</th>
        <th>Total TTC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${data.description}</td>
        <td>1</td>
        <td>${fmt(data.amountHT)}</td>
        <td>${fmt(data.vatAmount)}</td>
        <td>${fmt(data.amountTTC)}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3"></td>
        <td><strong>Total HT</strong></td>
        <td>${fmt(data.amountHT)}</td>
      </tr>
      <tr>
        <td colspan="3"></td>
        <td><strong>TVA ${Math.round(data.vatRate * 100)}%</strong></td>
        <td>${fmt(data.vatAmount)}</td>
      </tr>
      <tr>
        <td colspan="3"></td>
        <td class="total">Total TTC</td>
        <td class="total">${fmt(data.amountTTC)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <p>Demenagement24 &mdash; Plateforme de mise en relation déménageurs</p>
    <p>Paiement effectué par carte bancaire via Mollie.</p>
  </div>
</body>
</html>`;
}
