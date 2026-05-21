export const LOCALES = ["en", "sk"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function normalizeLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const lower = input.toLowerCase();
  if (lower.startsWith("sk")) return "sk";
  return "en";
}

/**
 * Resolves the active locale for a request. The `locale` cookie reflects the
 * user's explicit choice via the language toggle, so it wins over the language
 * stored on their account; the account language is only the initial default
 * (used until they toggle, e.g. on first login).
 */
export function resolveLocale({
  cookieLocale,
  sessionLanguage,
}: {
  cookieLocale?: string | null;
  sessionLanguage?: string | null;
}): Locale {
  if (cookieLocale) return normalizeLocale(cookieLocale);
  if (sessionLanguage) return normalizeLocale(sessionLanguage);
  return DEFAULT_LOCALE;
}
