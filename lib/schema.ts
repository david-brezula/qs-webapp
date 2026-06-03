import { FOOTER } from "./content";

const COMPANY_NAME = "Quantum Sphere s.r.o.";

// Parse "Lančár 113 · 922 04 Kočín-Lančár · Slovak Republic"
// into structured PostalAddress parts by splitting on " · ".
function parseAddress() {
  const parts = FOOTER.address.split(" · ");
  // parts[0] = "Lančár 113"
  // parts[1] = "922 04 Kočín-Lančár"  → postalCode + addressLocality
  // parts[2] = "Slovak Republic"    → country
  const streetAddress = parts[0] ?? "";
  const cityPart = parts[1] ?? "";
  // cityPart is "922 04 Kočín-Lančár" — split on first space cluster
  const cityMatch = cityPart.match(/^(\d[\d\s]*)(.+)$/);
  const postalCode = cityMatch ? cityMatch[1].trim() : "";
  const addressLocality = cityMatch ? cityMatch[2].trim() : cityPart;

  return { streetAddress, postalCode, addressLocality };
}

// ─── Return types ─────────────────────────────────────────────────────────────
// All schema interfaces extend Record<string, unknown> so they are assignable
// to the JsonLd component's `data` prop (which accepts Record<string, unknown>).

export interface ContactPoint extends Record<string, unknown> {
  "@type": "ContactPoint";
  telephone: string;
  email: string;
  contactType: string;
}

export interface OrganizationSchema extends Record<string, unknown> {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  url: string;
  logo?: string;
  sameAs: string[];
  contactPoint: ContactPoint;
}

export interface PostalAddress extends Record<string, unknown> {
  "@type": "PostalAddress";
  streetAddress: string;
  postalCode: string;
  addressLocality: string;
  addressCountry: string;
}

export interface LocalBusinessSchema extends Record<string, unknown> {
  "@context": "https://schema.org";
  "@type": "GeneralContractor";
  name: string;
  url: string;
  telephone: string;
  email: string;
  address: PostalAddress;
  areaServed: string[];
}

export interface OrganizationRef extends Record<string, unknown> {
  "@type": "Organization";
  name: string;
  url: string;
}

export interface ServiceSchema extends Record<string, unknown> {
  "@context": "https://schema.org";
  "@type": "Service";
  name: string;
  serviceType: string;
  url: string;
  provider: OrganizationRef;
  areaServed: string[];
}

export interface ListItem extends Record<string, unknown> {
  "@type": "ListItem";
  position: number;
  name: string;
  item: string;
}

export interface BreadcrumbSchema extends Record<string, unknown> {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: ListItem[];
}

// ─── Builders ─────────────────────────────────────────────────────────────────

export function organizationSchema(siteUrl: string): OrganizationSchema {
  // Only advertise a logo when a real asset path is configured. The brand mark
  // is currently an inline SVG (components/marketing/Logo.tsx) with no static
  // file, so emitting `${siteUrl}/logo.png` would point Google at a 404 and the
  // logo claim would be rejected. Set NEXT_PUBLIC_ORG_LOGO_URL to a relative
  // path (e.g. "/logo.png") once a rasterized logo exists in /public.
  const logoPath = process.env.NEXT_PUBLIC_ORG_LOGO_URL;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY_NAME,
    url: siteUrl,
    ...(logoPath ? { logo: `${siteUrl}${logoPath}` } : {}),
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: FOOTER.phone,
      email: FOOTER.email,
      contactType: "customer service",
    },
  };
}

export function localBusinessSchema(siteUrl: string): LocalBusinessSchema {
  const { streetAddress, postalCode, addressLocality } = parseAddress();
  return {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    name: COMPANY_NAME,
    url: siteUrl,
    telephone: FOOTER.phone,
    email: FOOTER.email,
    address: {
      "@type": "PostalAddress",
      streetAddress,
      postalCode,
      addressLocality,
      addressCountry: "SK",
    },
    areaServed: ["SK", "CZ", "AT", "HU"],
  };
}

export function serviceSchema(
  name: string,
  url: string,
  siteUrl: string,
): ServiceSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    serviceType: name,
    url,
    provider: {
      "@type": "Organization",
      name: COMPANY_NAME,
      url: siteUrl,
    },
    areaServed: ["SK", "CZ", "AT", "HU"],
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]): BreadcrumbSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
