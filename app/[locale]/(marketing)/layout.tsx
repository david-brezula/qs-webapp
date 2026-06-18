import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, localBusinessSchema } from "@/lib/schema";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: { default: "Quantum Sphere", template: "%s | Quantum Sphere" },
  description:
    "Komplexné stavebné riešenia pod jednou strechou — solárne elektrárne, elektroinštalácie, sadrokartón, murárske práce a montáž striech.",
};

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Seed the locale into next-intl's request cache BEFORE the Server-Component
  // footer (MarketingFooter -> useTranslations) renders. Without this, next-intl
  // falls back to headers() and opts the whole marketing tree into per-request
  // dynamic rendering, defeating static generation / CDN delivery.
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <JsonLd data={[organizationSchema(SITE_URL), localBusinessSchema(SITE_URL)]} />
      {/* Site-wide background texture (swap variant: texture-dots / texture-grid / texture-grain). */}
      <div aria-hidden className="texture-overlay texture-dots" />
      <MarketingHeader />
      <main className="min-h-screen">{children}</main>
      <MarketingFooter />
    </>
  );
}
