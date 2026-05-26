import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDoc, LegalSection } from "@/components/marketing/LegalDoc";
import { alternatesForPathname } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.privacy.meta" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: alternatesForPathname("/privacy", locale),
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.privacy" });

  const sections = ["controller", "scope", "purpose", "retention", "recipients", "rights", "cookies", "changes"] as const;

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
