import type { PortalRole } from "@/lib/portal/roles";

export type PortalNavItem = {
  href: string;
  labelKey:
    | "dashboard"
    | "projects"
    | "workers"
    | "clients"
    | "accommodations"
    | "wages"
    | "applications"
    | "inquiries";
};

/**
 * Portal navigation destinations. `labelKey` is a key in the `nav`
 * next-intl namespace — each consumer resolves it with its own `t`.
 */
export function getPortalNavItems(role: PortalRole): PortalNavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/dashboard", labelKey: "dashboard" },
      { href: "/projects", labelKey: "projects" },
      { href: "/workers", labelKey: "workers" },
      { href: "/clients", labelKey: "clients" },
      { href: "/accommodations", labelKey: "accommodations" },
      { href: "/wages", labelKey: "wages" },
      { href: "/applications", labelKey: "applications" },
      { href: "/inquiries", labelKey: "inquiries" },
    ];
  }
  if (role === "WORKER") {
    return [
      { href: "/dashboard", labelKey: "dashboard" },
      { href: "/wages", labelKey: "wages" },
    ];
  }
  return [];
}
