import Link from "next/link";
import { Truck } from "lucide-react";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { BRAND } from "@/lib/brand";

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

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteName = await getSiteName();

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="relative hidden w-[480px] shrink-0 overflow-hidden bg-brand-gradient lg:block">
        <div className="noise-overlay absolute inset-0" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Truck className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-2xl font-extrabold text-white">
              {siteName}
            </span>
          </Link>

          <div className="space-y-6">
            <h2 className="font-display text-3xl font-bold leading-tight text-white">
              Rejoignez le réseau des déménageurs professionnels
            </h2>
            <p className="text-base leading-relaxed text-white/80">
              Recevez des demandes de devis qualifiées dans votre zone
              d&apos;intervention et développez votre activité.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "200+", label: "entreprises" },
                { value: "15k+", label: "devis/an" },
                { value: "96%", label: "satisfaction" },
                { value: "24h", label: "réponse" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl bg-white/10 p-4 backdrop-blur-sm"
                >
                  <div className="font-display text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/50">
            &copy; {new Date().getFullYear()} {siteName}
          </p>
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-white/5" />
      </div>

      {/* Right panel — form content */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
