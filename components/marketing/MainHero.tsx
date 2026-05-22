import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/Button";

export function MainHero() {
  const t = useTranslations("home.hero");

  return (
    <section className="relative overflow-hidden border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
      {/* Atmospheric blueprint grid + soft accent wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-rule-soft) 1px, transparent 1px), linear-gradient(90deg, var(--color-rule-soft) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 30% 0%, #000 40%, transparent 100%)",
        }}
      />
      <Container className="relative py-24 md:py-36">
        <span className="eyebrow text-[var(--color-fjord)]">{t("kicker")}</span>
        <h1
          className="mt-5 font-display text-[2.75rem] sm:text-[3.5rem] md:text-[5rem] leading-[1.0] tracking-[-0.035em] text-[var(--color-ink)] max-w-4xl"
          style={{ fontWeight: 700 }}
        >
          {t("title")}
        </h1>
        <p className="mt-7 text-[1.0625rem] md:text-[1.25rem] text-[var(--color-slate)] max-w-2xl leading-[1.6]">
          {t("subtitle")}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/contact" className={buttonClass("primary")}>
            {t("ctaPrimary")}
            <ArrowRight size={15} strokeWidth={1.5} />
          </Link>
          <Link href="/about" className={buttonClass("secondary")}>
            {t("ctaSecondary")}
          </Link>
        </div>
      </Container>
    </section>
  );
}
