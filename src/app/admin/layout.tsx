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
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/companies", label: "Déménageurs", icon: Building2 },
  { href: "/admin/leads", label: "Leads", icon: FileText },
  { href: "/admin/transactions", label: "Paiements", icon: CreditCard },
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
  document.cookie = "admin_token=; path=/admin; max-age=0";
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

  // Skip auth check for login page
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.siteName) setSiteName(data.siteName); })
      .catch(() => {});
  }, []);

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-gray-950 text-gray-300 lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2.5 border-b border-gray-800 px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500">
              <Truck className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-base font-bold text-white">
              {siteName}
            </span>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin">
            {ADMIN_NAV.map((item) => {
              const isActive = pathname.startsWith(item.href);
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
                  {item.label}
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
      </aside>

      {/* Main */}
      <main className="flex-1">
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg font-bold text-foreground">
              {siteName} Admin
            </h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
