import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDoc, LegalSection } from "@/components/marketing/LegalDoc";
import { alternatesForPathname } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.impressum.meta" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: alternatesForPathname("/impressum", locale),
  };
}

export default async function ImpressumPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.impressum" });

  const sections = ["provider", "represented", "contact", "supervisory", "disclaimer"] as const;

  return (
    <LegalDoc eyebrow={t("eyebrow")} title={t("title")} updated={t("updated")}>
      {sections.map((s) => (
        <LegalSection key={s} heading={t(`${s}.heading`)}>
          {t(`${s}.body`)}
        </LegalSection>
      ))}
    </LegalDoc>
  );
}
