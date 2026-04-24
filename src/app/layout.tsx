import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/providers";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

async function getSiteName(): Promise<string> {
  try {
    const supabase = createUntypedAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("data")
      .eq("id", 1)
      .single();
    return (data?.data as Record<string, string>)?.siteName || BRAND.siteName;
  } catch {
    return BRAND.siteName;
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Resolve the canonical base URL for the site. Priority: explicit site env
// var → Vercel-provided preview/prod URL → last-resort localhost for dev.
// `metadataBase` is what lets per-page `alternates.canonical` return absolute
// URLs, which Next.js requires to emit a `<link rel="canonical">` tag.
function getMetadataBaseUrl(): URL {
  const candidate =
    BRAND.siteUrl ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return new URL(candidate);
}

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName();

  return {
    metadataBase: getMetadataBaseUrl(),
    title: {
      default: `${siteName} — Trouvez votre déménageur en France`,
      template: `%s | ${siteName}`,
    },
    description:
      "Comparez les devis de déménageurs professionnels près de chez vous. Gratuit, rapide et sans engagement. Plus de 200 entreprises vérifiées en France.",
    keywords: [
      "déménagement",
      "devis déménagement",
      "déménageur",
      "déménagement France",
      "comparateur déménageur",
    ],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${body.variable} ${display.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "10px",
              background: "#1f2937",
              color: "#f9fafb",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
