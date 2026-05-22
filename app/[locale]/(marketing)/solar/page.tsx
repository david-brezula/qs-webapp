import { setRequestLocale } from "next-intl/server";
import { ServicePage } from "@/components/marketing/ServicePage";

export default async function SolarLanding({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ServicePage slug="solar" />;
}
