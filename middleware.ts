import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

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

  if (!session?.user) {
    const url = req.nextUrl.clone();
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

  if (isAdminOnly && session.user.role !== "ADMIN" && !isWorkerProjectLog) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
