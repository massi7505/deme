import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import * as nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, provider } = body;

    if (!to) {
      return NextResponse.json({ error: "Adresse email requise" }, { status: 400 });
    }

    const subject = "Test email - Demenagement24";
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Configuration email réussie !</h2>
          <p>Si vous recevez cet email, votre configuration ${provider === "resend" ? "Resend" : "SMTP"} fonctionne correctement.</p>
          <p style="color: #6b7280; font-size: 14px;">Envoyé depuis les paramètres admin de Demenagement24.</p>
        </div>
      </div>
    `;

    if (provider === "resend") {
      const apiKey = body.resendApiKey;
      if (!apiKey) {
        return NextResponse.json({ error: "Clé API Resend manquante" }, { status: 400 });
      }
      const resend = new Resend(apiKey);
      const fromEmail = body.smtpFromEmail || "noreply@demenagement24.com";
      const fromName = body.smtpFromName || "Demenagement24";

      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html,
      });
    } else {
      // SMTP
      const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpEncryption, smtpFromName, smtpFromEmail } = body;

      if (!smtpHost) {
        return NextResponse.json({ error: "Serveur SMTP manquant" }, { status: 400 });
      }

      const port = parseInt(smtpPort) || 587;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: smtpEncryption === "ssl",
        auth: smtpUser ? { user: smtpUser, pass: smtpPassword } : undefined,
        tls: smtpEncryption === "tls" ? { rejectUnauthorized: false } : undefined,
      });

      await transporter.sendMail({
        from: `"${smtpFromName || "Demenagement24"}" <${smtpFromEmail || smtpUser}>`,
        to,
        subject,
        html,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur d'envoi";
    console.error("Test SMTP error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
