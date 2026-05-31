import { MetadataRoute } from "next";
import { routing } from "@/lib/i18n/routing";
import { localizedPathname, SITE_URL } from "@/lib/seo";
import { PROJECT_SLUGS } from "@/lib/projects";

const MARKETING_PATHS = [
  "/",
  "/solar",
  "/electrical",
  "/drywall",
  "/masonry",
  "/roofing",
  "/work",
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
  // Project case studies — localized /work prefix + stable slug.
  for (const slug of PROJECT_SLUGS) {
    const languages: Record<string, string> = {};
    for (const loc of routing.locales) {
      languages[loc] = `${SITE_URL}${localizedPathname("/work", loc)}/${slug}`;
    }
    for (const loc of routing.locales) {
      entries.push({
        url: `${SITE_URL}${localizedPathname("/work", loc)}/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: { languages },
      });
    }
  }
  return entries;
}
