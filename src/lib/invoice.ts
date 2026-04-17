import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { generateInvoiceNumber } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
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

interface InvoiceSettings {
  companyName: string;
  address: string;
  city: string;
  postalCode: string;
  email: string;
  siret: string;
  vatNumber: string;
  vatRate: number;
  priceMode: "ttc" | "ht";
  prefix: string;
  footer: string;
  conditions: string;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

async function getInvoiceSettings(): Promise<InvoiceSettings> {
  try {
    const supabase = createUntypedAdminClient();
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).single();
    const s = (data?.data || {}) as Record<string, string>;
    return {
      companyName: s.invoiceCompanyName || s.siteName || BRAND.siteName,
      address: s.invoiceAddress || s.contactAddress || "",
      city: s.invoiceCity || "",
      postalCode: s.invoicePostalCode || "",
      email: s.invoiceEmail || s.contactEmail || BRAND.contactEmail,
      siret: s.invoiceSiret || "",
      vatNumber: s.invoiceVatNumber || "",
      vatRate: parseFloat(s.invoiceVatRate || "20") / 100,
      priceMode: (s.invoicePriceMode as "ttc" | "ht") || "ttc",
      prefix: s.invoicePrefix || "FA",
      footer: s.invoiceFooter || "Paiement effectue par carte bancaire via Mollie.",
      conditions: s.invoiceConditions || "",
    };
  } catch {
    return {
      companyName: BRAND.siteName,
      address: "",
      city: "Paris",
      postalCode: "",
      email: BRAND.contactEmail,
      siret: "",
      vatNumber: "",
      vatRate: 0.2,
      priceMode: "ttc",
      prefix: "FA",
      footer: "Paiement effectue par carte bancaire via Mollie.",
      conditions: "",
    };
  }
}

export async function generateInvoice(data: InvoiceData) {
  const invoiceNumber = generateInvoiceNumber();
  const supabase = createUntypedAdminClient();
  const cfg = await getInvoiceSettings();

  const vatRate = cfg.vatRate;
  let amountTTC: number;
  let amountHT: number;
  let vatAmount: number;

  if (cfg.priceMode === "ttc") {
    // Price is TTC — extract HT from it
    amountTTC = data.amountCents;
    amountHT = Math.round(amountTTC / (1 + vatRate));
    vatAmount = amountTTC - amountHT;
  } else {
    // Price is HT — add TVA
    amountHT = data.amountCents;
    vatAmount = Math.round(amountHT * vatRate);
    amountTTC = amountHT + vatAmount;
  }

  const date = new Date().toLocaleDateString("fr-FR");

  const pdfBuffer = await buildInvoicePdf({
    invoiceNumber,
    // Seller (from settings)
    sellerName: cfg.companyName,
    sellerAddress: cfg.address,
    sellerCity: cfg.city,
    sellerPostalCode: cfg.postalCode,
    sellerEmail: cfg.email,
    sellerSiret: cfg.siret,
    sellerVatNumber: cfg.vatNumber,
    // Buyer (from company data)
    companyName: data.companyName,
    companySiret: data.companySiret,
    companyAddress: data.companyAddress,
    companyCity: data.companyCity,
    companyPostalCode: data.companyPostalCode,
    // Amounts
    description: data.description,
    amountHT,
    vatAmount,
    amountTTC,
    vatRate,
    priceMode: cfg.priceMode,
    // Footer
    footer: cfg.footer,
    conditions: cfg.conditions,
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
  sellerName: string;
  sellerAddress: string;
  sellerCity: string;
  sellerPostalCode: string;
  sellerEmail: string;
  sellerSiret: string;
  sellerVatNumber: string;
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
  priceMode: "ttc" | "ht";
  footer: string;
  conditions: string;
  date: string;
}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const green = rgb(0.133, 0.773, 0.369);
  const dark = rgb(0.122, 0.161, 0.216);
  const gray = rgb(0.420, 0.451, 0.498);
  const white = rgb(1, 1, 1);
  const lightGray = rgb(0.976, 0.98, 0.984);
  const lineGray = rgb(0.898, 0.906, 0.918);

  const margin = 50;
  const pageW = 595.28 - margin * 2;
  const vatPct = Math.round(data.vatRate * 100);

  // ── Header bar ──
  const headerH = 60;
  const headerY = height - margin - headerH;
  page.drawRectangle({ x: margin, y: headerY, width: pageW, height: headerH, color: green });
  page.drawText(data.sellerName, { x: margin + 20, y: headerY + 30, size: 22, font: fontBold, color: white });
  page.drawText("Plateforme de mise en relation demenageurs", { x: margin + 20, y: headerY + 12, size: 10, font: fontRegular, color: white });

  // ── Invoice title ──
  const titleY = headerY - 50;
  page.drawText("FACTURE", { x: margin + pageW - 120, y: titleY, size: 28, font: fontBold, color: dark });
  page.drawText(data.invoiceNumber, { x: margin + pageW - 120, y: titleY - 20, size: 11, font: fontRegular, color: gray });
  page.drawText(`Date : ${data.date}`, { x: margin + pageW - 120, y: titleY - 36, size: 11, font: fontRegular, color: gray });

  // ── From (seller) ──
  const addrY = titleY - 80;
  page.drawText("De :", { x: margin, y: addrY, size: 10, font: fontBold, color: dark });
  page.drawText(data.sellerName, { x: margin, y: addrY - 16, size: 10, font: fontRegular, color: gray });
  if (data.sellerAddress) page.drawText(data.sellerAddress, { x: margin, y: addrY - 30, size: 10, font: fontRegular, color: gray });
  const sellerCityLine = [data.sellerPostalCode, data.sellerCity].filter(Boolean).join(" ");
  if (sellerCityLine) page.drawText(sellerCityLine, { x: margin, y: addrY - 44, size: 10, font: fontRegular, color: gray });
  page.drawText(data.sellerEmail, { x: margin, y: addrY - 58, size: 10, font: fontRegular, color: gray });
  if (data.sellerSiret) page.drawText(`SIRET : ${data.sellerSiret}`, { x: margin, y: addrY - 72, size: 10, font: fontRegular, color: gray });
  if (data.sellerVatNumber) page.drawText(`TVA : ${data.sellerVatNumber}`, { x: margin, y: addrY - 86, size: 10, font: fontRegular, color: gray });

  // ── To (buyer) ──
  page.drawText("Facture a :", { x: 300, y: addrY, size: 10, font: fontBold, color: dark });
  page.drawText(data.companyName, { x: 300, y: addrY - 16, size: 10, font: fontRegular, color: gray });
  if (data.companyAddress) page.drawText(data.companyAddress, { x: 300, y: addrY - 30, size: 10, font: fontRegular, color: gray });
  page.drawText(`${data.companyPostalCode} ${data.companyCity}`, { x: 300, y: addrY - 44, size: 10, font: fontRegular, color: gray });
  page.drawText(`SIRET : ${data.companySiret}`, { x: 300, y: addrY - 58, size: 10, font: fontRegular, color: gray });

  // ── Table ──
  const tableTop = addrY - 120;
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
  page.drawText(`TVA (${vatPct}%)`, { x: col4, y: tableTop - 20, size: 9, font: fontBold, color: dark });
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

  page.drawText(`TVA ${vatPct}%`, { x: labelX, y: totalsY - 36, size: 10, font: fontRegular, color: gray });
  page.drawText(fmt(data.vatAmount), { x: valX, y: totalsY - 36, size: 10, font: fontRegular, color: gray });

  page.drawLine({ start: { x: labelX, y: totalsY - 48 }, end: { x: margin + pageW, y: totalsY - 48 }, thickness: 0.5, color: lineGray });

  page.drawText("Total TTC", { x: labelX, y: totalsY - 66, size: 14, font: fontBold, color: dark });
  page.drawText(fmt(data.amountTTC), { x: valX, y: totalsY - 66, size: 14, font: fontBold, color: dark });

  // ── Conditions ──
  let footerStartY = 120;
  if (data.conditions) {
    footerStartY = 150;
    const condY = footerStartY + 20;
    page.drawText("Conditions :", { x: margin, y: condY, size: 8, font: fontBold, color: gray });
    page.drawText(data.conditions, { x: margin, y: condY - 12, size: 7, font: fontRegular, color: gray, maxWidth: pageW });
  }

  // ── Footer ──
  const footerY = 80;
  page.drawLine({ start: { x: margin, y: footerY }, end: { x: margin + pageW, y: footerY }, thickness: 0.5, color: lineGray });
  page.drawText(`${data.sellerName} — Plateforme de mise en relation demenageurs`, { x: margin, y: footerY - 14, size: 8, font: fontRegular, color: gray });
  page.drawText(data.footer, { x: margin, y: footerY - 26, size: 8, font: fontRegular, color: gray });
  page.drawText(`Facture generee automatiquement le ${data.date}`, { x: margin, y: footerY - 38, size: 8, font: fontRegular, color: gray });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
