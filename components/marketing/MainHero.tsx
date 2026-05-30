import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/Button";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { SERVICES } from "@/lib/services";
import { HERO_IMAGE } from "@/lib/marketingImages";

export function MainHero() {
  const t = useTranslations("home.hero");
  const tServices = useTranslations("services");

  return (
    <section className="relative overflow-hidden border-b border-[var(--color-rule)] bg-[var(--color-canvas)]">
      {/* Restrained atmosphere — a single brand-blue wash, kept very subtle. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift absolute -top-44 -left-32 h-[34rem] w-[34rem] rounded-full bg-[var(--color-fjord)]/[0.07] blur-[130px]" />
        <div className="animate-drift-slow absolute -top-24 right-0 h-[24rem] w-[24rem] rounded-full bg-[var(--color-fjord)]/[0.04] blur-[130px]" />
      </div>
      {/* Engineering grid that fades toward the top-left. */}
      <div
        aria-hidden
        className="grid-fade pointer-events-none absolute inset-0 opacity-60"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 65% at 25% 0%, #000 35%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 65% at 25% 0%, #000 35%, transparent 100%)",
        }}
      />

      <Container className="relative py-20 md:py-28 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* Copy column */}
          <Stagger>
            <StaggerItem>
              <span className="inline-flex items-center gap-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-fjord)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-fjord)]" />
                {t("kicker")}
              </span>
            </StaggerItem>
            <StaggerItem>
              <h1
                className="mt-5 font-display text-[2.75rem] leading-[1.0] tracking-[-0.04em] text-ink-gradient sm:text-[3.5rem] md:text-[4.75rem] max-w-3xl"
                style={{ fontWeight: 700 }}
              >
                {t("title")}
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-7 max-w-2xl text-[1.0625rem] leading-[1.6] text-[var(--color-slate)] md:text-[1.25rem]">
                {t("subtitle")}
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/contact" className={buttonClass("primary")}>
                  {t("ctaPrimary")}
                  <ArrowRight
                    size={15}
                    strokeWidth={1.5}
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </Link>
                <Link href="/about" className={buttonClass("secondary")}>
                  {t("ctaSecondary")}
                </Link>
              </div>
            </StaggerItem>
            {/* Trade chips — neutral at rest, brand accent on hover. */}
            <StaggerItem>
              <div className="mt-11 flex flex-wrap gap-2.5">
                {SERVICES.map(({ slug, internalPath, icon: Icon }) => (
                  <Link
                    key={slug}
                    href={internalPath}
                    className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)]/70 py-1.5 pl-1.5 pr-3.5 text-[0.8125rem] font-medium text-[var(--color-slate)] shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-ink)]/25 hover:text-[var(--color-ink)] hover:shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-fjord)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-paper-2)]">
                      <Icon
                        size={14}
                        strokeWidth={1.75}
                        className="text-[var(--color-slate)] transition-colors group-hover:text-[var(--color-fjord)]"
                      />
                    </span>
                    {tServices(`${slug}.name`)}
                  </Link>
                ))}
              </div>
            </StaggerItem>
          </Stagger>

          {/* Visual column */}
          <Reveal delay={0.15} y={24} className="relative">
            <HeroVisual heroAlt={t("title")} />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function HeroVisual({ heroAlt }: { heroAlt: string }) {
  return (
    <div className="relative">
      {/* Soft neutral glow so the panel lifts off the page. */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-[var(--color-fjord)]/10 to-transparent blur-2xl"
      />
      <div className="relative overflow-hidden rounded-[var(--radius-feature)] border border-[var(--color-rule)] shadow-[var(--shadow-float)]">
        {HERO_IMAGE ? (
          <div className="relative aspect-[4/5] w-full sm:aspect-[5/4] lg:aspect-[4/5]">
            <Image
              src={HERO_IMAGE}
              alt={heroAlt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/45 via-[var(--color-ink)]/5 to-transparent"
            />
          </div>
        ) : (
          <BrandedHeroPanel />
        )}
      </div>
    </div>
  );
}

// Fallback when no hero photo is sourced: a restrained blueprint panel with the
// trade icons arranged over a brand-blue gradient + grid texture.
function BrandedHeroPanel() {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-[var(--color-fjord-soft)] via-[var(--color-paper)] to-[var(--color-canvas-2)] sm:aspect-[5/4] lg:aspect-[4/5]">
      <div aria-hidden className="blueprint-grid absolute inset-0 opacity-60" />
      <div aria-hidden className="grain absolute inset-0" />
      <div
        aria-hidden
        className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[var(--color-fjord)]/15 blur-3xl"
      />
      <div className="absolute inset-0 grid grid-cols-2 content-center gap-4 p-8 sm:p-12">
        {SERVICES.map(({ slug, icon: Icon }) => (
          <div
            key={slug}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-white/50 bg-white/70 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-sm"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-card)] bg-[var(--color-paper-2)]">
              <Icon size={18} strokeWidth={1.75} className="text-[var(--color-slate)]" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
