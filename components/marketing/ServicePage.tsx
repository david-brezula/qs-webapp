import { useTranslations, useLocale } from "next-intl";
import { Check, ArrowRight, Plus } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { serviceSchema, breadcrumbSchema } from "@/lib/schema";
import { localizedPathname, SITE_URL } from "@/lib/seo";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/Button";
import { getService, type ServiceSlug } from "@/lib/services";
import { Certifications } from "@/components/marketing/Certifications";
import { ContactCta } from "@/components/marketing/ContactCta";

type Step = { title: string; body: string };
type Faq = { q: string; a: string };

// Universal landing template for the five trades. Content comes entirely from
// the `services.<slug>` message namespace; array sections render only when filled.

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
    <>
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
      {/* Hero */}
      <section className="bg-[var(--color-canvas)] border-b border-[var(--color-rule)]">
        <Container className="py-20 md:py-28">
          <div className="flex items-center gap-3 mb-6">
            <span className="grid place-items-center h-10 w-10 rounded-[var(--radius-card)] bg-[var(--color-paper)] border border-[var(--color-rule)]">
              <Icon size={20} strokeWidth={1.5} className="text-[var(--color-fjord)]" />
            </span>
            <span className="eyebrow text-[var(--color-fjord)]">{t("name")}</span>
          </div>
          <h1
            className="font-display text-[2.5rem] md:text-[4rem] leading-[1.03] tracking-[-0.03em] text-[var(--color-ink)] max-w-4xl"
            style={{ fontWeight: 700 }}
          >
            {t("hero.title")}
          </h1>
          <p className="mt-6 text-[1.0625rem] md:text-[1.1875rem] text-[var(--color-slate)] max-w-2xl leading-[1.6]">
            {t("hero.subtitle")}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/contact" className={buttonClass("primary")}>
              {tNav("contact")}
              <ArrowRight size={15} strokeWidth={1.5} />
            </Link>
            <Link href="/about" className={buttonClass("secondary")}>
              {tNav("about")}
            </Link>
          </div>
        </Container>
      </section>

      {/* Description */}
      <section>
        <Container className="py-16 md:py-20">
          <p className="font-display text-[1.375rem] md:text-[1.75rem] leading-[1.5] tracking-[-0.01em] text-[var(--color-ink-2)] max-w-3xl">
            {t("description")}
          </p>
        </Container>
      </section>

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <section className="bg-[var(--color-canvas)] border-y border-[var(--color-rule)]">
          <Container className="py-16 md:py-24">
            <h2
              className="font-display text-[1.75rem] md:text-[2.25rem] tracking-[-0.02em] text-[var(--color-ink)] mb-10"
              style={{ fontWeight: 700 }}
            >
              {t("deliverables.title")}
            </h2>
            <ul className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
              {deliverables.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check
                    size={18}
                    strokeWidth={2}
                    className="mt-0.5 shrink-0 text-[var(--color-fjord)]"
                  />
                  <span className="text-[0.9375rem] text-[var(--color-slate)] leading-[1.55]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* Process */}
      {steps.length > 0 && (
        <section>
          <Container className="py-16 md:py-24">
            <h2
              className="font-display text-[1.75rem] md:text-[2.25rem] tracking-[-0.02em] text-[var(--color-ink)] mb-12"
              style={{ fontWeight: 700 }}
            >
              {t("process.title")}
            </h2>
            <ol className="grid gap-px bg-[var(--color-rule)] border border-[var(--color-rule)] rounded-[var(--radius-card)] overflow-hidden md:grid-cols-2">
              {steps.map((step, i) => (
                <li key={i} className="bg-[var(--color-paper)] p-7">
                  <span className="numeral font-display text-[2rem] text-[var(--color-rule)] block leading-none mb-3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[1.0625rem] font-semibold text-[var(--color-ink)] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[0.9375rem] text-[var(--color-slate)] leading-[1.6]">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </Container>
        </section>
      )}

      <Certifications slug={slug} />

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="bg-[var(--color-canvas)] border-y border-[var(--color-rule)]">
          <Container className="py-16 md:py-24 max-w-3xl">
            <h2
              className="font-display text-[1.75rem] md:text-[2.25rem] tracking-[-0.02em] text-[var(--color-ink)] mb-10"
              style={{ fontWeight: 700 }}
            >
              {t("faq.title")}
            </h2>
            <div className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
              {faqs.map((item, i) => (
                <details key={i} className="group py-5">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 list-none text-[1.0625rem] font-medium text-[var(--color-ink)]">
                    {item.q}
                    <Plus
                      size={18}
                      strokeWidth={1.5}
                      className="shrink-0 text-[var(--color-slate)] transition-transform duration-300 group-open:rotate-45"
                    />
                  </summary>
                  <p className="mt-3 text-[0.9375rem] text-[var(--color-slate)] leading-[1.65]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Contact CTA */}
      <ContactCta heading={t("tagline")} />
    </>
  );
}
