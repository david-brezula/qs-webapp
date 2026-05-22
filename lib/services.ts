import type { LucideIcon } from "lucide-react";
import { Sun, Zap, LayoutGrid, Hammer, Home } from "lucide-react";

export type ServiceSlug = "solar" | "electrical" | "drywall" | "masonry" | "roofing";

export type ServiceInternalPath =
  | "/solar"
  | "/electrical"
  | "/drywall"
  | "/masonry"
  | "/roofing";

// Single source of truth for the five trades. `messagesKey` matches the
// `services.<slug>` namespace in messages/*.json.
export const SERVICES: ReadonlyArray<{
  slug: ServiceSlug;
  internalPath: ServiceInternalPath;
  icon: LucideIcon;
  messagesKey: ServiceSlug;
}> = [
  { slug: "solar", internalPath: "/solar", icon: Sun, messagesKey: "solar" },
  { slug: "electrical", internalPath: "/electrical", icon: Zap, messagesKey: "electrical" },
  { slug: "drywall", internalPath: "/drywall", icon: LayoutGrid, messagesKey: "drywall" },
  { slug: "masonry", internalPath: "/masonry", icon: Hammer, messagesKey: "masonry" },
  { slug: "roofing", internalPath: "/roofing", icon: Home, messagesKey: "roofing" },
];

export function getService(slug: ServiceSlug) {
  return SERVICES.find((s) => s.slug === slug)!;
}
