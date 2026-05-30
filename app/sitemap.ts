import { MetadataRoute } from "next";
import { routing } from "@/lib/i18n/routing";
import { localizedPathname } from "@/lib/seo";

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
  "/impressum",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const internalPath of MARKETING_PATHS) {
    const languages: Record<string, string> = {};
    for (const loc of routing.locales) {
      languages[loc] = `${SITE_URL}${localizedPathname(internalPath, loc)}`;
    }
    for (const loc of routing.locales) {
      entries.push({
        url: `${SITE_URL}${localizedPathname(internalPath, loc)}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: internalPath === "/" ? 1.0 : 0.8,
        alternates: { languages },
      });
    }
  }
  return entries;
}
