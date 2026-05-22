import { routing } from "@/lib/i18n/routing";

// Builds the hreflang `alternates` map for a given internal pathname, using the
// localized slugs from the routing config. Relative URLs resolve against
// `metadataBase` (set in the [locale] root layout). The canonical is
// self-referencing (the current locale's own URL) so each localized page is
// indexed independently — pointing every locale at the default would de-index
// the others.
export function alternatesForPathname(internalPath: string, locale: string) {
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    const def = (routing.pathnames as Record<string, unknown>)[internalPath];
    const slug = typeof def === "string" ? def : (def as Record<string, string>)[loc];
    languages[loc] = `/${loc}${slug === "/" ? "" : slug}`;
  }
  return {
    languages,
    canonical: languages[locale] ?? languages[routing.defaultLocale],
  };
}
