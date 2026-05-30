import { useTranslations, useLocale } from "next-intl";
import { Check, ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { serviceSchema, breadcrumbSchema } from "@/lib/schema";
import { localizedPathname, SITE_URL } from "@/lib/seo";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/Button";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { getService, type ServiceSlug } from "@/lib/services";
import { tradeAccent } from "@/lib/trades";
import { TRADE_IMAGE } from "@/lib/marketingImages";
import { TradeImage } from "@/components/marketing/TradeImage";
import { FaqList } from "@/components/marketing/FaqList";
import { Certifications } from "@/components/marketing/Certifications";
import { ContactCta } from "@/components/marketing/ContactCta";

type Step = { title: string; body: string };
type Faq = { q: string; a: string };

// Universal landing template for the five trades. Content comes entirely from
// the `services.<slug>` message namespace; array sections render only when
// filled. The whole page wears its trade colour via a tradeAccent() wrapper.

export function ServicePage({ slug }: { slug: ServiceSlug }) {
  const t = useTranslations(`services.${slug}`);
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const { icon: Icon } = getService(slug);

  const deliverables = (t.raw("deliverables.items") as string[]) ?? [];
  const steps = (t.raw("process.steps") as Step[]) ?? [];
  const faqs = (t.raw("faq.items") as Faq[]) ?? [];

  const serviceUrl = `${SITE_URL}${localizedPathname(`/${slug}`, locale)}`;
  const homeUrl = `${SITE_URL}${localizedPathname("/", locale)}`;

  return (
    <div style={tradeAccent(slug)}>
      <JsonLd
        data={[
          serviceSchema(t("name"), serviceUrl, SITE_URL),
          breadcrumbSchema([
            { name: tNav("home"), url: homeUrl },
            { name: t("name"), url: serviceUrl },
          ]),
        ]}
      />
      {faqs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }}
        />
      )}

      {/* Trade-coloured identity bar across the very top. */}
      <div
        aria-hidden
        className="h-1 w-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-deep)]"
      />

      {/* Hero — copy + trade photo. */}
      <section className="relative overflow-hidden border-b border-[var(--color-rule)] bg-[var(--color-canvas)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[var(--accent-tint)] opacity-70 blur-3xl"
        />
        <div
          aria-hidden
          className="grid-fade pointer-events-none absolute inset-0 opacity-50"
          style={{
            maskImage:
              "radial-gradient(ellipse 70% 60% at 20% 0%, #000 35%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 20% 0%, #000 35%, transparent 100%)",
          }}
        />
        <Container className="relative py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <Stagger>
              <StaggerItem>
                <div className="mb-6 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-[var(--radius-card)] bg-[var(--accent-tint)] shadow-[var(--shadow-soft)]">
                    <Icon size={22} strokeWidth={1.5} className="text-[var(--accent)]" />
                  </span>
                  <span className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                    {t("name")}
                  </span>
                </div>
              </StaggerItem>
              <StaggerItem>
                <h1
                  className="max-w-2xl font-display text-[2.5rem] leading-[1.03] tracking-[-0.035em] text-[var(--color-ink)] md:text-[3.75rem]"
                  style={{ fontWeight: 700 }}
                >
                  {t("hero.title")}
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-6 max-w-2xl text-[1.0625rem] leading-[1.6] text-[var(--color-slate)] md:text-[1.1875rem]">
                  {t("hero.subtitle")}
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link href="/contact" className={buttonClass("primary")}>
                    {tNav("contact")}
                    <ArrowRight
                      size={15}
                      strokeWidth={1.5}
                      className="transition-transform duration-300 group-hover:translate-x-0.5"
                    />
                  </Link>
                  <Link href="/about" className={buttonClass("secondary")}>
                    {tNav("about")}
                  </Link>
                </div>
              </StaggerItem>
            </Stagger>

            <Reveal delay={0.15} y={24} className="group relative">
              <div
                aria-hidden
                className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-tr from-[var(--accent)]/15 to-transparent blur-2xl"
              />
              <TradeImage
                trade={slug}
                src={TRADE_IMAGE[slug]}
                alt={t("name")}
                ratio="aspect-[5/4]"
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="rounded-[var(--radius-feature)] border border-[var(--color-rule)] shadow-[var(--shadow-float)]"
              />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Lead description. */}
      <section className="bg-[var(--color-paper)]">
        <Container className="py-16 md:py-20">
          <Reveal>
            <p className="max-w-3xl font-display text-[1.375rem] leading-[1.5] tracking-[-0.01em] text-[var(--color-ink-2)] md:text-[1.75rem]">
              {t("description")}
            </p>
          </Reveal>
        </Container>
      </section>

      {/* Deliverables. */}
      {deliverables.length > 0 && (
        <section className="border-y border-[var(--color-rule)] bg-[var(--color-canvas)]">
          <Container className="py-16 md:py-24">
            <Reveal>
              <h2
                className="mb-10 font-display text-[1.75rem] tracking-[-0.025em] text-[var(--color-ink)] md:text-[2.25rem]"
                style={{ fontWeight: 700 }}
              >
                {t("deliverables.title")}
              </h2>
            </Reveal>
            <Stagger className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
              {deliverables.map((item, i) => (
                <StaggerItem key={i}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent-tint)]">
                      <Check size={14} strokeWidth={2.5} className="text-[var(--accent)]" />
                    </span>
                    <span className="text-[0.9375rem] leading-[1.55] text-[var(--color-slate)]">
                      {item}
                    </span>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </section>
      )}

      {/* Process — colour-coded numbered steps. */}
      {steps.length > 0 && (
        <section className="bg-[var(--color-paper)]">
          <Container className="py-16 md:py-24">
            <Reveal>
              <h2
                className="mb-12 font-display text-[1.75rem] tracking-[-0.025em] text-[var(--color-ink)] md:text-[2.25rem]"
                style={{ fontWeight: 700 }}
              >
                {t("process.title")}
              </h2>
            </Reveal>
            <Stagger className="grid gap-5 md:grid-cols-2">
              {steps.map((step, i) => (
                <StaggerItem key={i} className="h-full">
                  <div className="lift group relative h-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-7 shadow-[var(--shadow-card)] hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-float)]">
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-deep)] transition-transform duration-300 group-hover:scale-x-100"
                    />
                    <span className="numeral block leading-none text-[2.25rem] text-[var(--color-mist)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-3 text-[1.0625rem] font-semibold text-[var(--color-ink)]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[0.9375rem] leading-[1.6] text-[var(--color-slate)]">
                      {step.body}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </section>
      )}

      <Certifications slug={slug} />

      {/* FAQ. */}
      {faqs.length > 0 && (
        <section className="border-y border-[var(--color-rule)] bg-[var(--color-canvas)]">
          <Container className="max-w-3xl py-16 md:py-24">
            <Reveal>
              <h2
                className="mb-10 font-display text-[1.75rem] tracking-[-0.025em] text-[var(--color-ink)] md:text-[2.25rem]"
                style={{ fontWeight: 700 }}
              >
                {t("faq.title")}
              </h2>
            </Reveal>
            <Reveal delay={0.05}>
              <FaqList items={faqs} />
            </Reveal>
          </Container>
        </section>
      )}

      {/* Contact CTA. */}
      <ContactCta heading={t("tagline")} />
    </div>
  );
}
