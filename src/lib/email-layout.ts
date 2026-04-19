/**
 * Shared HTML shell for all transactional emails.
 *
 * Design notes:
 * - Inline CSS only — Gmail/Outlook strip <style> in many cases.
 * - Max 600px width (standard for clients with fixed preview pane).
 * - All colors are hex so Outlook renders them predictably.
 * - Single entry point: wrapping a body string in siteName + link + heading
 *   accent ensures every email has a consistent header + footer.
 */

interface EmailLayoutOptions {
  siteName: string;
  baseUrl: string;
  /** Hex color used for header gradient start. Default: brand green. */
  accent?: string;
  /** Hex color for gradient end. Default: deeper brand green. */
  accentDeep?: string;
}

export function emailShell(inner: string, opts: EmailLayoutOptions): string {
  const accent = opts.accent ?? "#22c55e";
  const accentDeep = opts.accentDeep ?? "#16a34a";
  const { siteName, baseUrl } = opts;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${siteName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111827;line-height:1.55;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,${accent},${accentDeep});padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.2px;">${siteName}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">${inner}</td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
              <p style="margin:0 0 6px;">
                <a href="${baseUrl}" style="color:#6b7280;text-decoration:none;">${baseUrl.replace(/^https?:\/\//, "")}</a>
              </p>
              <p style="margin:0;">© ${new Date().getFullYear()} ${siteName}. Vous recevez cet email car votre compte est actif sur notre plateforme.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Primary CTA button — use inside template bodies. */
export function emailButton(href: string, label: string, color = "#22c55e"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;"><tr><td style="border-radius:8px;background:${color};"><a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">${label}</a></td></tr></table>`;
}
