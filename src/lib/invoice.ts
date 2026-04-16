import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { generateInvoiceNumber } from "@/lib/utils";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const green = rgb(0.133, 0.773, 0.369); // #22c55e
  const dark = rgb(0.122, 0.161, 0.216);  // #1f2937
  const gray = rgb(0.420, 0.451, 0.498);  // #6b7280
  const white = rgb(1, 1, 1);
  const lightGray = rgb(0.976, 0.98, 0.984); // #f9fafb
  const lineGray = rgb(0.898, 0.906, 0.918); // #e5e7eb

  const margin = 50;
  const pageW = 595.28 - margin * 2;

  // ── Header bar ──
  const headerH = 60;
  const headerY = height - margin - headerH;
  page.drawRectangle({ x: margin, y: headerY, width: pageW, height: headerH, color: green });
  page.drawText("Demenagement24", { x: margin + 20, y: headerY + 30, size: 22, font: fontBold, color: white });
  page.drawText("Plateforme de mise en relation demenageurs", { x: margin + 20, y: headerY + 12, size: 10, font: fontRegular, color: white });

  // ── Invoice title ──
  const titleY = headerY - 50;
  page.drawText("FACTURE", { x: margin + pageW - 120, y: titleY, size: 28, font: fontBold, color: dark });
  page.drawText(data.invoiceNumber, { x: margin + pageW - 120, y: titleY - 20, size: 11, font: fontRegular, color: gray });
  page.drawText(`Date : ${data.date}`, { x: margin + pageW - 120, y: titleY - 36, size: 11, font: fontRegular, color: gray });

  // ── From / To ──
  const addrY = titleY - 80;

  page.drawText("De :", { x: margin, y: addrY, size: 10, font: fontBold, color: dark });
  page.drawText("Demenagement24", { x: margin, y: addrY - 16, size: 10, font: fontRegular, color: gray });
  page.drawText("Paris, France", { x: margin, y: addrY - 30, size: 10, font: fontRegular, color: gray });
  page.drawText("contact@demenagement24.com", { x: margin, y: addrY - 44, size: 10, font: fontRegular, color: gray });

  page.drawText("Facture a :", { x: 300, y: addrY, size: 10, font: fontBold, color: dark });
  page.drawText(data.companyName, { x: 300, y: addrY - 16, size: 10, font: fontRegular, color: gray });
  if (data.companyAddress) {
    page.drawText(data.companyAddress, { x: 300, y: addrY - 30, size: 10, font: fontRegular, color: gray });
  }
  page.drawText(`${data.companyPostalCode} ${data.companyCity}`, { x: 300, y: addrY - 44, size: 10, font: fontRegular, color: gray });
  page.drawText(`SIRET : ${data.companySiret}`, { x: 300, y: addrY - 58, size: 10, font: fontRegular, color: gray });

  // ── Table ──
  const tableTop = addrY - 100;
  const rowH = 28;
  const col1 = margin + 10;
  const col2 = 280;
  const col3 = 360;
  const col4 = 440;
  const col5 = 510;

  // Header row
  page.drawRectangle({ x: margin, y: tableTop - rowH, width: pageW, height: rowH, color: lightGray });
  page.drawText("Designation", { x: col1, y: tableTop - 20, size: 9, font: fontBold, color: dark });
  page.drawText("Qte", { x: col2, y: tableTop - 20, size: 9, font: fontBold, color: dark });
  page.drawText("Prix HT", { x: col3, y: tableTop - 20, size: 9, font: fontBold, color: dark });
  page.drawText(`TVA (${Math.round(data.vatRate * 100)}%)`, { x: col4, y: tableTop - 20, size: 9, font: fontBold, color: dark });
  page.drawText("Total TTC", { x: col5, y: tableTop - 20, size: 9, font: fontBold, color: dark });

  // Separator
  const rowY = tableTop - rowH;
  page.drawLine({ start: { x: margin, y: rowY }, end: { x: margin + pageW, y: rowY }, thickness: 0.5, color: lineGray });

  // Data row
  page.drawText(data.description, { x: col1, y: rowY - 18, size: 9, font: fontRegular, color: dark, maxWidth: 220 });
  page.drawText("1", { x: col2, y: rowY - 18, size: 9, font: fontRegular, color: dark });
  page.drawText(fmt(data.amountHT), { x: col3, y: rowY - 18, size: 9, font: fontRegular, color: dark });
  page.drawText(fmt(data.vatAmount), { x: col4, y: rowY - 18, size: 9, font: fontRegular, color: dark });
  page.drawText(fmt(data.amountTTC), { x: col5, y: rowY - 18, size: 9, font: fontRegular, color: dark });

  // ── Totals ──
  const totalsY = rowY - 50;
  page.drawLine({ start: { x: margin, y: totalsY }, end: { x: margin + pageW, y: totalsY }, thickness: 0.5, color: lineGray });

  const labelX = 400;
  const valX = 510;

  page.drawText("Total HT", { x: labelX, y: totalsY - 18, size: 10, font: fontRegular, color: gray });
  page.drawText(fmt(data.amountHT), { x: valX, y: totalsY - 18, size: 10, font: fontRegular, color: gray });

  page.drawText(`TVA ${Math.round(data.vatRate * 100)}%`, { x: labelX, y: totalsY - 36, size: 10, font: fontRegular, color: gray });
  page.drawText(fmt(data.vatAmount), { x: valX, y: totalsY - 36, size: 10, font: fontRegular, color: gray });

  page.drawLine({ start: { x: labelX, y: totalsY - 48 }, end: { x: margin + pageW, y: totalsY - 48 }, thickness: 0.5, color: lineGray });

  page.drawText("Total TTC", { x: labelX, y: totalsY - 66, size: 14, font: fontBold, color: dark });
  page.drawText(fmt(data.amountTTC), { x: valX, y: totalsY - 66, size: 14, font: fontBold, color: dark });

  // ── Footer ──
  const footerY = 80;
  page.drawLine({ start: { x: margin, y: footerY }, end: { x: margin + pageW, y: footerY }, thickness: 0.5, color: lineGray });
  page.drawText("Demenagement24 — Plateforme de mise en relation demenageurs", { x: margin, y: footerY - 14, size: 8, font: fontRegular, color: gray });
  page.drawText("Paiement effectue par carte bancaire via Mollie.", { x: margin, y: footerY - 26, size: 8, font: fontRegular, color: gray });
  page.drawText(`Facture generee automatiquement le ${data.date}`, { x: margin, y: footerY - 38, size: 8, font: fontRegular, color: gray });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
