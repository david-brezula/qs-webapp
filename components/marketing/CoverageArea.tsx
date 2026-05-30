import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function CoverageArea() {
  const t = useTranslations("home.coverage");

  return (
    <section className="border-y border-[var(--color-rule)]">
      <Container className="py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <img
            src="/coverage-map.svg"
            alt=""
            className="w-full max-w-md"
          />
          <SectionHeading title={t("title")} lede={t("body")} />
        </div>
      </Container>
    </section>
  );
}
