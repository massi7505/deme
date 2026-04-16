import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { generateInvoiceNumber } from "@/lib/utils";
import PDFDocument from "pdfkit";

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
  vatRate?: number;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

export async function generateInvoice(data: InvoiceData) {
  const invoiceNumber = generateInvoiceNumber();
  const supabase = createUntypedAdminClient();

  const amountHT = data.amountCents;
  const vatRate = data.vatRate ?? 0.2;
  const vatAmount = Math.round(amountHT * vatRate);
  const amountTTC = amountHT + vatAmount;
  const date = new Date().toLocaleDateString("fr-FR");

  // Generate PDF buffer
  const pdfBuffer = await buildInvoicePdf({
    invoiceNumber,
    companyName: data.companyName,
    companySiret: data.companySiret,
    companyAddress: data.companyAddress,
    companyCity: data.companyCity,
    companyPostalCode: data.companyPostalCode,
    description: data.description,
    amountHT,
    vatAmount,
    amountTTC,
    vatRate,
    date,
  });

  const fileName = `${data.companyId}/${invoiceNumber}.pdf`;
  const { data: uploadData, error } = await supabase.storage
    .from("invoices")
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload invoice: ${error.message}`);
  }

  await supabase
    .from("transactions")
    .update({
      invoice_number: invoiceNumber,
      invoice_url: uploadData.path,
    })
    .eq("id", data.transactionId);

  return { invoiceNumber, path: uploadData.path };
}

async function buildInvoicePdf(data: {
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
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const green = "#22c55e";
    const gray = "#6b7280";
    const dark = "#1f2937";
    const pageW = doc.page.width - 100; // 50 margin each side

    // ── Header ──────────────────────────────────────────────
    doc.rect(50, 50, pageW, 60).fill(green);
    doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold")
      .text("Demenagement24", 70, 68);
    doc.fontSize(10).font("Helvetica")
      .text("Plateforme de mise en relation demenageurs", 70, 92);

    // ── Invoice title ───────────────────────────────────────
    doc.fillColor(dark).fontSize(28).font("Helvetica-Bold")
      .text("FACTURE", 50, 140, { align: "right" });
    doc.fillColor(gray).fontSize(11).font("Helvetica")
      .text(data.invoiceNumber, 50, 172, { align: "right" })
      .text(`Date : ${data.date}`, 50, 188, { align: "right" });

    // ── From / To ───────────────────────────────────────────
    const yAddr = 230;

    // From (us)
    doc.fillColor(dark).fontSize(10).font("Helvetica-Bold")
      .text("De :", 50, yAddr);
    doc.fillColor(gray).fontSize(10).font("Helvetica")
      .text("Demenagement24", 50, yAddr + 16)
      .text("Paris, France", 50, yAddr + 30)
      .text("contact@demenagement24.com", 50, yAddr + 44);

    // To (company)
    doc.fillColor(dark).fontSize(10).font("Helvetica-Bold")
      .text("Facture a :", 300, yAddr);
    doc.fillColor(gray).fontSize(10).font("Helvetica")
      .text(data.companyName, 300, yAddr + 16)
      .text(data.companyAddress || "", 300, yAddr + 30)
      .text(`${data.companyPostalCode} ${data.companyCity}`, 300, yAddr + 44)
      .text(`SIRET : ${data.companySiret}`, 300, yAddr + 58);

    // ── Table ───────────────────────────────────────────────
    const tableTop = 340;
    const col1 = 50;
    const col2 = 280;
    const col3 = 360;
    const col4 = 440;
    const col5 = 510;

    // Header row
    doc.rect(50, tableTop, pageW, 28).fill("#f9fafb");
    doc.fillColor(dark).fontSize(9).font("Helvetica-Bold")
      .text("Designation", col1 + 10, tableTop + 8)
      .text("Qte", col2, tableTop + 8)
      .text("Prix HT", col3, tableTop + 8)
      .text(`TVA (${Math.round(data.vatRate * 100)}%)`, col4, tableTop + 8)
      .text("Total TTC", col5, tableTop + 8);

    // Data row
    const rowY = tableTop + 28;
    doc.rect(50, rowY, pageW, 0.5).fill("#e5e7eb");
    doc.fillColor(dark).fontSize(9).font("Helvetica")
      .text(data.description, col1 + 10, rowY + 10, { width: 220 })
      .text("1", col2, rowY + 10)
      .text(fmt(data.amountHT), col3, rowY + 10)
      .text(fmt(data.vatAmount), col4, rowY + 10)
      .text(fmt(data.amountTTC), col5, rowY + 10);

    // ── Totals ──────────────────────────────────────────────
    const totalsY = rowY + 50;
    doc.rect(50, totalsY, pageW, 0.5).fill("#e5e7eb");

    const labelX = 400;
    const valX = 510;

    doc.fillColor(gray).fontSize(10).font("Helvetica")
      .text("Total HT", labelX, totalsY + 12)
      .text(fmt(data.amountHT), valX, totalsY + 12);

    doc.text(`TVA ${Math.round(data.vatRate * 100)}%`, labelX, totalsY + 30)
      .text(fmt(data.vatAmount), valX, totalsY + 30);

    doc.rect(labelX, totalsY + 48, pageW - 350, 0.5).fill("#e5e7eb");

    doc.fillColor(dark).fontSize(14).font("Helvetica-Bold")
      .text("Total TTC", labelX, totalsY + 58)
      .text(fmt(data.amountTTC), valX, totalsY + 58);

    // ── Footer ──────────────────────────────────────────────
    const footerY = 700;
    doc.rect(50, footerY, pageW, 0.5).fill("#e5e7eb");
    doc.fillColor(gray).fontSize(8).font("Helvetica")
      .text("Demenagement24 — Plateforme de mise en relation demenageurs", 50, footerY + 10)
      .text("Paiement effectue par carte bancaire via Mollie.", 50, footerY + 22)
      .text(`Facture generee automatiquement le ${data.date}`, 50, footerY + 34);

    doc.end();
  });
}
