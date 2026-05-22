import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <section>
      <Container className="py-20 md:py-28 max-w-3xl">
        <h1
          className="font-display text-[2.5rem] md:text-[3.5rem] leading-[1.05] tracking-[-0.03em] text-[var(--color-ink)]"
          style={{ fontWeight: 700 }}
        >
          {t("title")}
        </h1>
        <div className="mt-8 space-y-6 text-[1.0625rem] md:text-[1.1875rem] text-[var(--color-slate)] leading-[1.7] whitespace-pre-line">
          {t("body")}
        </div>
      </Container>
    </section>
  );
}
