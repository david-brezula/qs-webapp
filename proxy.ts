import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Next.js 16 proxy convention (formerly middleware.ts): the file must export
// a plain `proxy` function. The session is read straight from the JWT cookie
// via getToken — the NextAuth `auth()` middleware wrapper is NOT a valid
// proxy module in Next 16 and fails with "adapterFn is not a function".
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/api/contact") ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/logos") ||
    pathname === "/panel-grid.svg" ||
    pathname === "/coverage-map.svg" ||
    pathname === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const adminOnlyPrefixes = ["/projects", "/workers", "/accommodations", "/wages"];
  const adminOnlySubpaths = ["/edit", "/new"];
  const isAdminOnly =
    adminOnlyPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    adminOnlySubpaths.some((sp) => pathname.endsWith(sp));

  const isWorkerProjectLog = /^\/projects\/[^/]+\/log\/?$/.test(pathname);
  const isWorkerWages = pathname === "/wages";

  if (isAdminOnly && token.role !== "ADMIN" && !isWorkerProjectLog && !isWorkerWages) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
