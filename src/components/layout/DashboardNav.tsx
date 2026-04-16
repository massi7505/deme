"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  FileText,
  Building2,
  Settings2,
  BookOpen,
  Receipt,
  User,
  LogOut,
  Truck,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/apercu", label: "Aperçu", icon: LayoutDashboard },
  { href: "/demandes-de-devis", label: "Demandes de devis", icon: FileText },
  { href: "/profil-entreprise", label: "Profil d'entreprise", icon: Building2 },
  { href: "/configurations", label: "Configurations", icon: Settings2 },
  { href: "/recommandations", label: "Recommandations", icon: BookOpen },
  { href: "/facturation", label: "Facturation", icon: Receipt },
  { href: "/compte", label: "Compte", icon: User },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [companyName, setCompanyName] = useState("Mon entreprise");
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    fetch("/api/dashboard/overview")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.company?.name) setCompanyName(d.company.name);
        if (d?.stats?.totalLeads) setLeadCount(d.stats.totalLeads);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r bg-white lg:block">
      <div className="flex h-full flex-col">
        {/* Company header */}
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <Truck className="h-5 w-5 text-[var(--brand-green)]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {companyName}
              </p>
              <p className="text-xs text-muted-foreground">Tableau de bord</p>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/apercu" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-green-50 text-[var(--brand-green-dark)] shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    isActive ? "text-[var(--brand-green)]" : ""
                  )}
                />
                {item.label}
                {item.href === "/demandes-de-devis" && leadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-green)] px-1.5 text-[10px] font-bold text-white">
                    {leadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="border-t p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/90 backdrop-blur-lg lg:hidden">
      <nav className="container flex items-center justify-around py-2">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/apercu" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-[var(--brand-green)]"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
