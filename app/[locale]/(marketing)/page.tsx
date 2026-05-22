import { setRequestLocale, getTranslations } from "next-intl/server";
import { MainHero } from "@/components/marketing/MainHero";
import { ServicesGrid } from "@/components/marketing/ServicesGrid";
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
      <ServicesGrid />
      <AboutTeaser />
    </>
  );
}
