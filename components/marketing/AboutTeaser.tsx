import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/motion";

export function AboutTeaser() {
  const t = useTranslations("home.about");
  const tNav = useTranslations("nav");

  return (
    <section className="bg-[var(--color-canvas)]">
      <Container className="py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-[1fr_1.25fr] md:items-start">
          <Reveal>
            <div className="border-l-2 border-[var(--color-fjord)] pl-6">
              <h2
                className="font-display text-[2rem] leading-[1.08] tracking-[-0.03em] text-[var(--color-ink)] md:text-[3rem]"
                style={{ fontWeight: 700 }}
              >
                {t("title")}
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="whitespace-pre-line text-[1.0625rem] leading-[1.7] text-[var(--color-slate)] md:text-[1.1875rem]">
              {t("body")}
            </p>
            <Link
              href="/about"
              className="group mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-[var(--color-ink)] transition-colors hover:text-[var(--color-fjord)]"
            >
              {tNav("about")}
              <ArrowRight
                size={16}
                strokeWidth={1.5}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
