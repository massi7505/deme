"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  AlertTriangle,
  Newspaper,
  FileEdit,
  Star,
  Settings,
  Truck,
  LogOut,
  ChevronLeft,
  BookOpenCheck,
  Menu,
  X,
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/companies", label: "Déménageurs", icon: Building2 },
  { href: "/admin/leads", label: "Leads", icon: FileText },
  { href: "/admin/transactions", label: "Paiements", icon: CreditCard },
  { href: "/admin/comptabilite", label: "Comptabilité", icon: BookOpenCheck },
  { href: "/admin/claims", label: "Réclamations", icon: AlertTriangle },
  { href: "/admin/blog", label: "Blog", icon: Newspaper },
  { href: "/admin/pages", label: "Pages CMS", icon: FileEdit },
  { href: "/admin/reviews", label: "Avis", icon: Star },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

function getAdminToken(): string | null {
  const match = document.cookie.match(/admin_token=([^;]+)/);
  return match ? match[1] : null;
}

function clearAdminToken() {
  document.cookie = "admin_token=; path=/; max-age=0";
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [siteName, setSiteName] = useState("Admin");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState(0);

  // Close mobile nav when navigating to another page
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Skip auth check for login page
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.siteName) setSiteName(data.siteName); })
      .catch(() => {});
  }, []);

  // Poll moderation badges. Re-fetches on every route change so the counter
  // updates right after the admin approves/rejects from inside /admin/companies.
  useEffect(() => {
    if (isLoginPage || !authenticated) return;
    let cancelled = false;
    const load = () => {
      fetch("/api/admin/stats/moderation")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d) setPendingPhotos(d.pendingPhotos || 0);
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isLoginPage, authenticated, pathname]);

  useEffect(() => {
    if (isLoginPage) {
      setAuthenticated(true);
      return;
    }

    const token = getAdminToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    // Verify token via API
    fetch("/api/admin/verify", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (res.ok) {
        setAuthenticated(true);
      } else {
        clearAdminToken();
        router.replace("/admin/login");
      }
    });
  }, [pathname, isLoginPage, router]);

  // Login page renders without sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state
  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (!authenticated) return null;

  function handleLogout() {
    clearAdminToken();
    router.replace("/admin/login");
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between gap-2.5 border-b border-gray-800 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500">
            <Truck className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-base font-bold text-white">
            {siteName}
          </span>
        </div>
        <button
          onClick={() => setMobileNavOpen(false)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-200 lg:hidden"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin">
        {ADMIN_NAV.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const badge = item.href === "/admin/companies" && pendingPhotos > 0 ? pendingPhotos : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-green-500/10 text-green-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span
                  className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow-sm ring-2 ring-red-500/30 animate-pulse"
                  title={`${badge} photo${badge > 1 ? "s" : ""} à modérer`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour au site
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-gray-950 text-gray-300 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar (overlay) */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-950 text-gray-300 shadow-xl lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="border-b bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="flex-1 truncate font-display text-base font-bold text-foreground sm:text-lg">
              {siteName} Admin
            </h1>
            <button
              onClick={handleLogout}
              className="shrink-0 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted sm:px-3"
              aria-label="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
