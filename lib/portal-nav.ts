export type PortalNavItem = {
  href: string;
  labelKey:
    | "dashboard"
    | "projects"
    | "workers"
    | "accommodations"
    | "wages"
    | "applications"
    | "inquiries";
};

/**
 * Portal navigation destinations. `labelKey` is a key in the `nav`
 * next-intl namespace — each consumer resolves it with its own `t`.
 */
export function getPortalNavItems(role: "ADMIN" | "WORKER"): PortalNavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/dashboard", labelKey: "dashboard" },
      { href: "/projects", labelKey: "projects" },
      { href: "/workers", labelKey: "workers" },
      { href: "/accommodations", labelKey: "accommodations" },
      { href: "/wages", labelKey: "wages" },
      { href: "/applications", labelKey: "applications" },
      { href: "/inquiries", labelKey: "inquiries" },
    ];
  }
  return [
    { href: "/dashboard", labelKey: "dashboard" },
    { href: "/wages", labelKey: "wages" },
  ];
}
