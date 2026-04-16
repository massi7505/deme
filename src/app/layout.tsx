import type { Metadata } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/providers";
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

export const metadata: Metadata = {
  title: {
    default: "Demenagement24 — Trouvez votre déménageur en France",
    template: "%s | Demenagement24",
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
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Demenagement24",
  },
};

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
