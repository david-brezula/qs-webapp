import type { Metadata } from "next";
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

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={[organizationSchema(SITE_URL), localBusinessSchema(SITE_URL)]} />
      <MarketingHeader />
      <main className="min-h-screen">{children}</main>
      <MarketingFooter />
    </>
  );
}
