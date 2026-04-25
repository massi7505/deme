"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Menu as MenuIcon,
  MoreHorizontal,
  ChevronsUpDown,
  TrendingUp,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/apercu", label: "Aperçu", shortLabel: "Aperçu", icon: LayoutDashboard },
  { href: "/demandes-de-devis", label: "Demandes de devis", shortLabel: "Demandes", icon: FileText },
  { href: "/performance", label: "Performance", shortLabel: "Perf.", icon: TrendingUp },
  { href: "/profil-entreprise", label: "Profil d'entreprise", shortLabel: "Profil", icon: Building2 },
  { href: "/configurations", label: "Configurations", shortLabel: "Config", icon: Settings2 },
  { href: "/recommandations", label: "Recommandations", shortLabel: "Aide", icon: BookOpen },
  { href: "/facturation", label: "Facturation", shortLabel: "Facturation", icon: Receipt },
  { href: "/compte", label: "Compte", shortLabel: "Compte", icon: User },
] as const;

const BOTTOM_PRIMARY = [
  NAV_ITEMS[0], // Aperçu
  NAV_ITEMS[1], // Demandes
  NAV_ITEMS[6], // Facturation
  NAV_ITEMS[3], // Profil
];

function useCompanyInfo() {
  const [companyName, setCompanyName] = useState("Mon entreprise");
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    fetch("/api/dashboard/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.company?.name) setCompanyName(d.company.name);
        setLeadCount(d?.stats?.pendingLeads ?? 0);
      })
      .catch(() => {});
  }, []);

  return { companyName, leadCount };
}

async function signOutAndRedirect() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/connexion";
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "E";
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-green-50 text-[var(--brand-green-dark)] shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-[var(--brand-green)]" : ""
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-green)] px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function CompanyBadge({ companyName }: { companyName: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 rounded-lg bg-green-50">
        <AvatarFallback className="rounded-lg bg-green-50 text-sm font-bold text-[var(--brand-green)]">
          {getInitials(companyName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {companyName}
        </p>
        <p className="text-xs text-muted-foreground">Espace déménageur</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Desktop sidebar
 * ───────────────────────────────────────────────────────────── */

export function DashboardNav() {
  const pathname = usePathname();
  const { companyName, leadCount } = useCompanyInfo();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-white lg:block">
      <div className="flex h-full flex-col">
        {/* Company header */}
        <div className="border-b p-4">
          <CompanyBadge companyName={companyName} />
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive}
                badge={item.href === "/demandes-de-devis" ? leadCount : undefined}
              />
            );
          })}
        </nav>

        {/* Footer — user menu */}
        <div className="border-t p-3">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)] focus:ring-offset-1">
              <Avatar className="h-9 w-9 rounded-lg bg-green-50">
                <AvatarFallback className="rounded-lg bg-green-50 text-xs font-bold text-[var(--brand-green)]">
                  {getInitials(companyName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {companyName}
                </p>
                <p className="text-xs text-muted-foreground">Mon compte</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-56"
              sideOffset={8}
            >
              <DropdownMenuLabel className="truncate">
                {companyName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/compte" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Mon compte
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/compte/parametres" className="cursor-pointer">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOutAndRedirect}
                className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Mobile top bar (dashboard-specific)
 * ───────────────────────────────────────────────────────────── */

export function DashboardMobileHeader() {
  const pathname = usePathname();
  const { companyName, leadCount } = useCompanyInfo();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/90 px-4 backdrop-blur-lg lg:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient shadow-sm shadow-green-500/20">
          <Truck className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            {companyName}
          </p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            Espace déménageur
          </p>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Menu"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
        >
          <MenuIcon className="h-5 w-5" />
          {leadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-green)] px-1 text-[9px] font-bold text-white">
              {leadCount}
            </span>
          )}
        </SheetTrigger>
        <SheetContent side="right" className="flex w-80 max-w-[85vw] flex-col p-0">
          <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Accédez à toutes les sections de votre espace déménageur
          </SheetDescription>

          <div className="border-b p-4">
            <CompanyBadge companyName={companyName} />
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/apercu" && pathname.startsWith(item.href));
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive}
                  badge={
                    item.href === "/demandes-de-devis" ? leadCount : undefined
                  }
                  onClick={() => setOpen(false)}
                />
              );
            })}
          </nav>

          <Separator />

          <div className="p-3">
            <button
              onClick={signOutAndRedirect}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Déconnexion
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Mobile bottom nav
 * ───────────────────────────────────────────────────────────── */

export function MobileNav() {
  const pathname = usePathname();
  const { leadCount } = useCompanyInfo();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = ["/configurations", "/recommandations", "/compte"].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
      <nav className="grid grid-cols-5">
        {BOTTOM_PRIMARY.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);
          const showBadge =
            item.href === "/demandes-de-devis" && leadCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-[var(--brand-green)]"
                  : "text-muted-foreground active:bg-muted/60"
              )}
            >
              <div className="relative">
                <item.icon
                  className={cn("h-[22px] w-[22px]", isActive && "stroke-[2.4]")}
                />
                {showBadge && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-green)] px-1 text-[9px] font-bold text-white">
                    {leadCount}
                  </span>
                )}
              </div>
              <span className="truncate">{item.shortLabel}</span>
              {isActive && (
                <span className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-[var(--brand-green)]" />
              )}
            </Link>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger
            className={cn(
              "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors",
              moreActive
                ? "text-[var(--brand-green)]"
                : "text-muted-foreground active:bg-muted/60"
            )}
          >
            <MoreHorizontal className="h-[22px] w-[22px]" />
            <span>Plus</span>
            {moreActive && (
              <span className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-[var(--brand-green)]" />
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]">
            <SheetTitle className="sr-only">Plus d&apos;options</SheetTitle>
            <SheetDescription className="sr-only">
              Accès aux autres sections de votre espace
            </SheetDescription>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
            <nav className="grid grid-cols-2 gap-2 p-4">
              {[NAV_ITEMS[3], NAV_ITEMS[4], NAV_ITEMS[6]].map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
                      isActive
                        ? "border-[var(--brand-green)] bg-green-50 text-[var(--brand-green-dark)]"
                        : "border-border bg-white text-foreground active:bg-muted"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-6 w-6",
                        isActive ? "text-[var(--brand-green)]" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={signOutAndRedirect}
                className="flex flex-col items-center gap-2 rounded-xl border border-red-100 bg-red-50/50 p-4 text-center text-red-600 transition-colors active:bg-red-50"
              >
                <LogOut className="h-6 w-6" />
                <span className="text-sm font-medium">Déconnexion</span>
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
