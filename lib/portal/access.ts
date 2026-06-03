// Pure portal access-control predicates, operating on locale-stripped paths
// (e.g. "/wages/advances", not "/sk/wages/advances"). Kept free of any
// Next.js / next-auth imports so they can be unit-tested in isolation; the
// runtime gate in `proxy.ts` composes them with the auth token + locale.

// Locale-stripped (internal) portal paths that require authentication.
export const PORTAL_PATHS = [
  "/dashboard",
  "/projects",
  "/workers",
  "/accommodations",
  "/wages",
  "/clients",
  "/portal",
  "/login",
  "/change-password",
];

const ADMIN_ONLY_PREFIXES = ["/projects", "/workers", "/accommodations", "/wages", "/clients"];
const ADMIN_ONLY_SUBPATHS = ["/edit", "/new"];

export function isPortalPath(p: string): boolean {
  return PORTAL_PATHS.some((prefix) => p === prefix || p.startsWith(prefix + "/"));
}

export function isAdminOnly(p: string): boolean {
  return (
    ADMIN_ONLY_PREFIXES.some((pre) => p === pre || p.startsWith(pre + "/")) ||
    ADMIN_ONLY_SUBPATHS.some((sub) => p.endsWith(sub))
  );
}

// Paths that sit under an admin-only prefix but are legitimately reachable by
// workers (each renders a worker-scoped view). Keep in sync with the pages
// that branch on `user.role !== "ADMIN"`.
export function isWorkerAllowedAdminPath(p: string): boolean {
  return (
    /^\/projects\/[^/]+\/log\/?$/.test(p) ||
    p === "/wages" ||
    p === "/wages/advances"
  );
}

// The proxy redirects a non-admin worker away from a path iff this returns true.
export function isBlockedForWorker(p: string): boolean {
  return isAdminOnly(p) && !isWorkerAllowedAdminPath(p);
}

// Locale-stripped client-portal base. CLIENT logins may reach ONLY this area
// (and /change-password). Everything else — admin and worker paths alike — is
// blocked for clients.
const CLIENT_BASE = "/portal";

export function isClientPath(p: string): boolean {
  return p === CLIENT_BASE || p.startsWith(CLIENT_BASE + "/");
}

export function isAllowedForClient(p: string): boolean {
  return (
    isClientPath(p) ||
    p === "/change-password" ||
    p.startsWith("/change-password/")
  );
}
