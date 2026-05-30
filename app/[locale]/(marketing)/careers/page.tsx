import { setRequestLocale, getTranslations } from "next-intl/server";
import { alternatesForPathname } from "@/lib/seo";
import { CareersForm } from "./CareersForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "careers.meta" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: alternatesForPathname("/careers", locale),
  };
}

export default async function CareersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CareersForm />;
}
