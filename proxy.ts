import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

// Next.js 16 proxy convention (formerly middleware.ts): export a plain `proxy`
// function. Order: host split (prod) -> locale handling (next-intl) -> auth gate.
const intlMiddleware = createIntlMiddleware(routing);

const MARKETING_HOST = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
  : "quantum-sphere.eu";

const PORTAL_HOST = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
  : "app.quantum-sphere.eu";

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

function isLocalOrPreview(host: string): boolean {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".vercel.app")
  );
}

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
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;
  const { locale, path: strippedPath } = stripLocale(pathname);

  // 0) Host split — only on real production hosts (skip localhost / *.vercel.app).
  if (!isLocalOrPreview(host)) {
    // Marketing host serving a portal path -> portal host.
    if (host === MARKETING_HOST && isPortalPath(strippedPath)) {
      const url = request.nextUrl.clone();
      url.host = PORTAL_HOST;
      url.protocol = "https:";
      url.port = "";
      return NextResponse.redirect(url);
    }
    // Portal host serving a marketing path -> marketing host.
    if (host === PORTAL_HOST && !isPortalPath(strippedPath)) {
      const url = request.nextUrl.clone();
      url.host = MARKETING_HOST;
      url.protocol = "https:";
      url.port = "";
      return NextResponse.redirect(url);
    }
  }

  // 1) next-intl locale handling (redirects for missing/invalid locale, rewrites
  //    localized slugs, sets the locale cookie).
  const intlResponse = intlMiddleware(request);
  if (intlResponse.headers.get("location")) {
    return intlResponse;
  }

  // 2) auth gate for portal paths
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
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2)$).*)",
  ],
};
