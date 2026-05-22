import { setRequestLocale, getTranslations } from "next-intl/server";
import { ServicePage } from "@/components/marketing/ServicePage";
import { alternatesForPathname } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services.solar.meta" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: alternatesForPathname("/solar", locale),
  };
}

export default async function SolarLanding({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ServicePage slug="solar" />;
}
