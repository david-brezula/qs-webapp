import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

// Next.js 16 proxy convention (formerly middleware.ts): export a plain `proxy`
// function. Locale handling runs first (next-intl), then the portal auth gate.
// The session is read straight from the JWT cookie via getToken — the NextAuth
// `auth()` wrapper is NOT a valid proxy module in Next 16.
const intlMiddleware = createIntlMiddleware(routing);

// Locale-stripped (internal) portal paths that require authentication.
const PORTAL_PATHS = [
  "/dashboard",
  "/projects",
  "/workers",
  "/accommodations",
  "/wages",
  "/login",
  "/change-password",
];

const ADMIN_ONLY_PREFIXES = ["/projects", "/workers", "/accommodations", "/wages"];
const ADMIN_ONLY_SUBPATHS = ["/edit", "/new"];

function stripLocale(pathname: string): { locale: string | null; path: string } {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return { locale: null, path: "/" };
  const first = segments[0];
  if ((routing.locales as readonly string[]).includes(first)) {
    return { locale: first, path: "/" + segments.slice(1).join("/") };
  }
  return { locale: null, path: pathname };
}

function isPortalPath(p: string): boolean {
  return PORTAL_PATHS.some((prefix) => p === prefix || p.startsWith(prefix + "/"));
}

function isAdminOnly(p: string): boolean {
  return (
    ADMIN_ONLY_PREFIXES.some((pre) => p === pre || p.startsWith(pre + "/")) ||
    ADMIN_ONLY_SUBPATHS.some((sub) => p.endsWith(sub))
  );
}

function isWorkerAllowedAdminPath(p: string): boolean {
  return /^\/projects\/[^/]+\/log\/?$/.test(p) || p === "/wages";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) next-intl locale handling (redirects for missing/invalid locale, rewrites
  //    localized slugs, sets the locale cookie).
  const intlResponse = intlMiddleware(request);
  if (intlResponse.headers.get("location")) {
    return intlResponse;
  }

  // 2) auth gate for portal paths
  const { locale, path: strippedPath } = stripLocale(pathname);
  if (!isPortalPath(strippedPath)) return intlResponse;
  if (strippedPath === "/login") return intlResponse;

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale ?? routing.defaultLocale}/login`;
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (
    isAdminOnly(strippedPath) &&
    token.role !== "ADMIN" &&
    !isWorkerAllowedAdminPath(strippedPath)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale ?? routing.defaultLocale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2)$).*)",
  ],
};
