import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Auth routes (login, register, etc.) — redirect authenticated users away.
 */
const AUTH_ROUTES = [
  "/connexion",
  "/creer-compte",
  "/inscription",
  "/mot-de-passe-oublie",
];

/**
 * Dashboard routes — require authentication.
 */
const DASHBOARD_PREFIX = [
  "/apercu",
  "/compte",
  "/configurations",
  "/demandes-de-devis",
  "/facturation",
  "/profil-entreprise",
  "/recommandations",
];

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from dashboard routes
  const isDashboardRoute = DASHBOARD_PREFIX.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth routes
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/apercu";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets (images, fonts, etc.)
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$|api/).*)",
  ],
};
