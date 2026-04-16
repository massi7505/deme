/**
 * Publicly reachable base URL for links in emails + redirects.
 * Prefers NEXT_PUBLIC_URL (unless it's localhost), then VERCEL_URL,
 * then falls back to http://localhost:3000.
 */
export function emailBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_URL;
  if (url && !url.includes("localhost")) return url;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return url || "http://localhost:3000";
}
