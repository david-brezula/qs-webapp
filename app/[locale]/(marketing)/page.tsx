import { setRequestLocale, getTranslations } from "next-intl/server";
import { MainHero } from "@/components/marketing/MainHero";
import { StatsBand } from "@/components/marketing/StatsBand";
import { ServicesGrid } from "@/components/marketing/ServicesGrid";
import { ValuesGrid } from "@/components/marketing/ValuesGrid";
import { Portfolio } from "@/components/marketing/Portfolio";
import { CoverageArea } from "@/components/marketing/CoverageArea";
import { AboutTeaser } from "@/components/marketing/AboutTeaser";
import { alternatesForPathname } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.meta" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: alternatesForPathname("/", locale),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <MainHero />
      <StatsBand />
      <ServicesGrid />
      <ValuesGrid />
      <Portfolio />
      <CoverageArea />
      <AboutTeaser />
    </>
  );
}
