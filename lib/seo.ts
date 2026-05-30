import { routing } from "@/lib/i18n/routing";

// Single source of truth for the public site origin.
// Set NEXT_PUBLIC_SITE_URL in .env.production (and .env.local for local dev
// if you want to override); falls back to the canonical production domain.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://quantum-sphere.eu";

// Returns the localized path for a given internal pathname and locale.
// E.g. localizedPathname("/solar", "sk") → "/sk/solarne-elektrarne"
//      localizedPathname("/", "sk")      → "/sk"
export function localizedPathname(internalPath: string, locale: string): string {
  const def = (routing.pathnames as Record<string, unknown>)[internalPath];
  const slug = typeof def === "string" ? def : (def as Record<string, string>)[locale];
  return `/${locale}${slug === "/" ? "" : slug}`;
}

// Builds the hreflang `alternates` map for a given internal pathname, using the
// localized slugs from the routing config. Relative URLs resolve against
// `metadataBase` (set in the [locale] root layout). The canonical is
// self-referencing (the current locale's own URL) so each localized page is
// indexed independently — pointing every locale at the default would de-index
// the others.
export function alternatesForPathname(internalPath: string, locale: string) {
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = localizedPathname(internalPath, loc);
  }
  return {
    languages,
    canonical: languages[locale] ?? languages[routing.defaultLocale],
  };
}
