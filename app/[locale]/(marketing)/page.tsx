import { setRequestLocale } from "next-intl/server";
import { MainHero } from "@/components/marketing/MainHero";
import { ServicesGrid } from "@/components/marketing/ServicesGrid";
import { AboutTeaser } from "@/components/marketing/AboutTeaser";

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
