import { MetadataRoute } from "next";
import { routing } from "@/lib/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quantum-sphere.eu";

const MARKETING_PATHS = [
  "/",
  "/solar",
  "/electrical",
  "/drywall",
  "/masonry",
  "/roofing",
  "/about",
  "/contact",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const internalPath of MARKETING_PATHS) {
    for (const loc of routing.locales) {
      const def = (routing.pathnames as Record<string, unknown>)[internalPath];
      const slug = typeof def === "string" ? def : (def as Record<string, string>)[loc];
      const url = `${SITE_URL}/${loc}${slug === "/" ? "" : slug}`;
      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: internalPath === "/" ? 1.0 : 0.8,
      });
    }
  }
  return entries;
}
