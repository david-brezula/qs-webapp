import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";

export function AboutTeaser() {
  const t = useTranslations("home.about");
  const tNav = useTranslations("nav");

  return (
    <section>
      <Container className="py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-[1fr_1.25fr] md:items-start">
          <h2
            className="font-display text-[2rem] md:text-[3rem] leading-[1.08] tracking-[-0.025em] text-[var(--color-ink)]"
            style={{ fontWeight: 700 }}
          >
            {t("title")}
          </h2>
          <div>
            <p className="text-[1.0625rem] md:text-[1.1875rem] leading-[1.7] text-[var(--color-slate)] whitespace-pre-line">
              {t("body")}
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-[var(--color-ink)] hover:text-[var(--color-fjord)] transition-colors"
            >
              {tNav("about")}
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
