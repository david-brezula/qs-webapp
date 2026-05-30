import { defineRouting } from "next-intl/routing";

// Source of truth for marketing + portal locale routing.
// Language codes, NOT country codes (e.g. `sv`, not `se`).
export const routing = defineRouting({
  locales: ["sk", "en", "de", "fr", "sv"],
  defaultLocale: "sk",
  localePrefix: "always",
  localeDetection: false,

  pathnames: {
    "/": "/",

    "/solar": {
      sk: "/solarne-elektrarne",
      en: "/solar-power-plants",
      de: "/solaranlagen",
      fr: "/centrales-solaires",
      sv: "/solcellsanlaggningar",
    },
    "/electrical": {
      sk: "/elektroinstalacie",
      en: "/electrical-installations",
      de: "/elektroinstallationen",
      fr: "/installations-electriques",
      sv: "/elinstallationer",
    },
    "/drywall": {
      sk: "/sadrokartonove-prace",
      en: "/drywall-installation",
      de: "/trockenbau",
      fr: "/cloisons-seches",
      sv: "/gipsvaggar",
    },
    "/masonry": {
      sk: "/murarske-prace",
      en: "/masonry-services",
      de: "/maurerarbeiten",
      fr: "/travaux-de-maconnerie",
      sv: "/murningsarbeten",
    },
    "/roofing": {
      sk: "/montaz-striech",
      en: "/roof-installation",
      de: "/dachmontage",
      fr: "/installation-de-toitures",
      sv: "/takmontering",
    },
    "/about": {
      sk: "/o-nas",
      en: "/about-us",
      de: "/uber-uns",
      fr: "/a-propos",
      sv: "/om-oss",
    },
    "/careers": {
      sk: "/kariera",
      en: "/careers",
      de: "/karriere",
      fr: "/carrieres",
      sv: "/karriar",
    },
    "/contact": {
      sk: "/kontakt",
      en: "/contact",
      de: "/kontakt",
      fr: "/contact",
      sv: "/kontakt",
    },
    "/privacy": {
      sk: "/ochrana-osobnych-udajov",
      en: "/privacy-policy",
      de: "/datenschutz",
      fr: "/politique-de-confidentialite",
      sv: "/integritetspolicy",
    },
    "/cookies": {
      sk: "/cookies",
      en: "/cookies",
      de: "/cookies",
      fr: "/cookies",
      sv: "/cookies",
    },
    "/impressum": {
      sk: "/impressum",
      en: "/legal-notice",
      de: "/impressum",
      fr: "/mentions-legales",
      sv: "/impressum",
    },
    "/terms": {
      sk: "/obchodne-podmienky",
      en: "/terms",
      de: "/agb",
      fr: "/conditions-generales",
      sv: "/villkor",
    },

    // Portal — English slugs for every locale (not SEO-targeted).
    "/login": "/login",
    "/dashboard": "/dashboard",
    "/projects": "/projects",
    "/workers": "/workers",
    "/accommodations": "/accommodations",
    "/wages": "/wages",
    "/applications": "/applications",
    "/inquiries": "/inquiries",
    "/change-password": "/change-password",
  },
});

export type Locale = (typeof routing.locales)[number];
export type Pathname = keyof typeof routing.pathnames;

// Native display labels for the language switcher.
export const localeLabels: Record<Locale, string> = {
  sk: "Slovenčina",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  sv: "Svenska",
};
