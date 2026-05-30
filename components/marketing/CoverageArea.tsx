import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/motion";

export function CoverageArea() {
  const t = useTranslations("home.coverage");

  return (
    <section className="border-y border-[var(--color-rule)] bg-[var(--color-paper)]">
      <Container className="py-20 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <Reveal className="relative order-2 md:order-1">
            <div
              aria-hidden
              className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-[var(--color-fjord)]/10 to-transparent blur-2xl"
            />
            <div className="relative overflow-hidden rounded-[var(--radius-feature)] border border-[var(--color-rule)] bg-[var(--color-canvas)] p-8 shadow-[var(--shadow-card)] md:p-10">
              <div aria-hidden className="grid-fade absolute inset-0 opacity-50" />
              <div aria-hidden className="grain absolute inset-0" />
              <img
                src="/coverage-map.svg"
                alt=""
                aria-hidden="true"
                className="relative mx-auto w-full max-w-md"
              />
            </div>
          </Reveal>
          <Reveal className="order-1 md:order-2">
            <SectionHeading title={t("title")} lede={t("body")} />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
