import { useTranslations, useLocale } from "next-intl";
import { Check, ArrowRight, ArrowLeft, MapPin, CalendarDays } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { localizedPathname, SITE_URL } from "@/lib/seo";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { tradeAccent } from "@/lib/trades";
import { PROJECT_IMAGE } from "@/lib/marketingImages";
import { TradeImage } from "./TradeImage";
import { ContactCta } from "./ContactCta";
import {
  getProjectBySlug,
  relatedProjects,
  type ProjectStatus,
} from "@/lib/projects";
import { getService } from "@/lib/services";

type Step = { title: string; body: string };

const STATUS_STYLE: Record<ProjectStatus, string> = {
  completed: "bg-[var(--trade-roofing-tint)] text-[var(--status-completed)]",
  inProgress: "bg-[var(--trade-solar-tint)] text-[var(--status-progress)]",
  planned: "bg-[var(--color-paper-2)] text-[var(--status-planned)]",
};

// Case-study page for a single project. Content lives in projects.items.<key>;
// structural data (trade, status, year) in lib/projects.ts. The whole page wears
// its trade colour via tradeAccent(). Optional sections render only when filled.
export function ProjectCaseStudy({ slug }: { slug: string }) {
  const project = getProjectBySlug(slug);
  const t = useTranslations("projects");
  const tStatus = useTranslations("home.featuredProjects");
  const tServices = useTranslations("services");
  const tNav = useTranslations("nav");
  const locale = useLocale();

  if (!project) return null;
  const { key, trade, status, year } = project;
  const { icon: Icon } = getService(trade);

  const scope = (t.raw(`items.${key}.scope`) as string[]) ?? [];
  const steps = (t.raw(`items.${key}.process`) as Step[]) ?? [];
  const challenge = t(`items.${key}.challenge`);
  const outcome = t(`items.${key}.outcome`);
  const related = relatedProjects(project);

  const outcomeTitle =
    status === "completed"
      ? t("detail.outcomeTitle")
      : status === "inProgress"
        ? t("detail.statusTitleInProgress")
        : t("detail.statusTitlePlanned");

  const homeUrl = `${SITE_URL}${localizedPathname("/", locale)}`;
  const indexUrl = `${SITE_URL}${localizedPathname("/work", locale)}`;
  const selfUrl = `${indexUrl}/${slug}`;

  return (
    <div style={tradeAccent(trade)}>
      <JsonLd
        data={breadcrumbSchema([
          { name: tNav("home"), url: homeUrl },
          { name: t("index.title"), url: indexUrl },
          { name: t(`items.${key}.title`), url: selfUrl },
        ])}
      />

      {/* Trade-coloured identity bar across the very top. */}
      <div
        aria-hidden
        className="h-1 w-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-deep)]"
      />

      {/* Hero — copy + project photo. */}
      <section className="relative overflow-hidden border-b border-[var(--color-rule)] bg-[var(--color-canvas)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[var(--accent-tint)] opacity-70 blur-3xl"
        />
        <Container className="relative py-14 md:py-20">
          {/* Breadcrumb. */}
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex items-center gap-2 text-[0.8125rem] text-[var(--color-mist)]"
          >
            <Link href="/" className="transition-colors hover:text-[var(--color-ink)]">
              {tNav("home")}
            </Link>
            <span aria-hidden>/</span>
            <Link href="/work" className="transition-colors hover:text-[var(--color-ink)]">
              {t("index.title")}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-[var(--color-slate)]">{t(`items.${key}.title`)}</span>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <Stagger>
              <StaggerItem>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-[var(--radius-card)] bg-[var(--accent-tint)] shadow-[var(--shadow-soft)]">
                    <Icon size={22} strokeWidth={1.5} className="text-[var(--accent)]" />
                  </span>
                  <span className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                    {tServices(`${trade}.name`)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${STATUS_STYLE[status]}`}
                  >
                    {tStatus(`status.${status}`)}
                  </span>
                </div>
              </StaggerItem>
              <StaggerItem>
                <h1
                  className="max-w-2xl font-display text-[2.25rem] leading-[1.05] tracking-[-0.035em] text-[var(--color-ink)] md:text-[3.25rem]"
                  style={{ fontWeight: 700 }}
                >
                  {t(`items.${key}.title`)}
                </h1>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.875rem] text-[var(--color-slate)]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={15} strokeWidth={1.5} className="text-[var(--color-mist)]" />
                    {t(`items.${key}.location`)}
                  </span>
                  {year && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={15} strokeWidth={1.5} className="text-[var(--color-mist)]" />
                      {year}
                    </span>
                  )}
                </div>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-6 max-w-2xl text-[1.0625rem] leading-[1.6] text-[var(--color-slate)] md:text-[1.1875rem]">
                  {t(`items.${key}.summary`)}
                </p>
              </StaggerItem>
            </Stagger>

            <Reveal delay={0.15} y={24} className="group relative">
              <div
                aria-hidden
                className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-tr from-[var(--accent)]/15 to-transparent blur-2xl"
              />
              <TradeImage
                trade={trade}
                src={PROJECT_IMAGE[key]}
                alt={t(`items.${key}.title`)}
                ratio="aspect-[5/4]"
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                label={tServices(`${trade}.name`)}
                className="rounded-[var(--radius-feature)] border border-[var(--color-rule)] shadow-[var(--shadow-float)]"
              />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Overview. */}
      <section className="bg-[var(--color-paper)]">
        <Container className="py-16 md:py-20">
          <Reveal>
            <h2 className="eyebrow mb-4 text-[var(--accent)]">{t("detail.overviewTitle")}</h2>
            <p className="max-w-3xl font-display text-[1.375rem] leading-[1.5] tracking-[-0.01em] text-[var(--color-ink-2)] md:text-[1.75rem]">
              {t(`items.${key}.overview`)}
            </p>
          </Reveal>
        </Container>
      </section>

      {/* The brief / challenge. */}
      {challenge && (
        <section className="border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
          <Container className="py-12 md:py-16">
            <Reveal>
              <h2
                className="mb-5 font-display text-[1.5rem] tracking-[-0.025em] text-[var(--color-ink)] md:text-[2rem]"
                style={{ fontWeight: 700 }}
              >
                {t("detail.challengeTitle")}
              </h2>
              <p className="max-w-3xl text-[1.0625rem] leading-[1.65] text-[var(--color-slate)]">
                {challenge}
              </p>
            </Reveal>
          </Container>
        </section>
      )}

      {/* What we did — scope checklist. */}
      {scope.length > 0 && (
        <section className="border-y border-[var(--color-rule)] bg-[var(--color-canvas)]">
          <Container className="py-16 md:py-24">
            <Reveal>
              <h2
                className="mb-10 font-display text-[1.75rem] tracking-[-0.025em] text-[var(--color-ink)] md:text-[2.25rem]"
                style={{ fontWeight: 700 }}
              >
                {t("detail.scopeTitle")}
              </h2>
            </Reveal>
            <Stagger className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
              {scope.map((item, i) => (
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

      {/* How we did it — numbered process steps. */}
      {steps.length > 0 && (
        <section className="bg-[var(--color-paper)]">
          <Container className="py-16 md:py-24">
            <Reveal>
              <h2
                className="mb-12 font-display text-[1.75rem] tracking-[-0.025em] text-[var(--color-ink)] md:text-[2.25rem]"
                style={{ fontWeight: 700 }}
              >
                {t("detail.processTitle")}
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

      {/* Outcome / current status / what we'll deliver. */}
      {outcome && (
        <section className="border-y border-[var(--color-rule)] bg-[var(--color-canvas)]">
          <Container className="py-16 md:py-20">
            <Reveal>
              <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                <h2
                  className="font-display text-[1.75rem] tracking-[-0.025em] text-[var(--color-ink)] md:text-[2.25rem]"
                  style={{ fontWeight: 700 }}
                >
                  {outcomeTitle}
                </h2>
                <div>
                  <p className="text-[1.125rem] leading-[1.6] text-[var(--color-ink-2)]">
                    {outcome}
                  </p>
                  {/* Project at a glance. */}
                  <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-[var(--color-rule)] pt-8 sm:grid-cols-4">
                    <div>
                      <dt className="eyebrow text-[var(--color-mist)]">{t("detail.facts.trade")}</dt>
                      <dd className="mt-1 text-[0.9375rem] font-medium text-[var(--color-ink)]">
                        {tServices(`${trade}.name`)}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow text-[var(--color-mist)]">{t("detail.facts.location")}</dt>
                      <dd className="mt-1 text-[0.9375rem] font-medium text-[var(--color-ink)]">
                        {t(`items.${key}.location`)}
                      </dd>
                    </div>
                    {year && (
                      <div>
                        <dt className="eyebrow text-[var(--color-mist)]">{t("detail.facts.year")}</dt>
                        <dd className="mt-1 text-[0.9375rem] font-medium text-[var(--color-ink)]">
                          {year}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="eyebrow text-[var(--color-mist)]">{t("detail.facts.status")}</dt>
                      <dd className="mt-1 text-[0.9375rem] font-medium text-[var(--color-ink)]">
                        {tStatus(`status.${status}`)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </Reveal>
          </Container>
        </section>
      )}

      {/* Related projects. */}
      {related.length > 0 && (
        <section className="bg-[var(--color-paper)]">
          <Container className="py-16 md:py-24">
            <Reveal>
              <div className="mb-10 flex items-center justify-between gap-4">
                <h2
                  className="font-display text-[1.75rem] tracking-[-0.025em] text-[var(--color-ink)] md:text-[2.25rem]"
                  style={{ fontWeight: 700 }}
                >
                  {t("detail.relatedTitle")}
                </h2>
                <Link
                  href="/work"
                  className="inline-flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-fjord)]"
                >
                  <ArrowLeft size={14} strokeWidth={1.75} />
                  {t("backLabel")}
                </Link>
              </div>
            </Reveal>
            <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((rel) => (
                <StaggerItem key={rel.key} className="h-full">
                  <Link
                    href={{ pathname: "/work/[slug]", params: { slug: rel.slug } }}
                    className="lift group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] shadow-[var(--shadow-card)] transition-colors hover:border-[var(--color-ink)]/15 hover:shadow-[var(--shadow-float)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]"
                  >
                    <TradeImage
                      trade={rel.trade}
                      src={PROJECT_IMAGE[rel.key]}
                      alt={t(`items.${rel.key}.title`)}
                      ratio="aspect-[16/10]"
                      label={tServices(`${rel.trade}.name`)}
                      className="border-b border-[var(--color-rule)]"
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-slate)]">
                        {tServices(`${rel.trade}.name`)}
                      </span>
                      <h3 className="mt-2 text-[0.9375rem] font-semibold text-[var(--color-ink)]">
                        {t(`items.${rel.key}.title`)}
                      </h3>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--color-ink)]">
                        {t("viewCase")}
                        <ArrowRight
                          size={14}
                          strokeWidth={1.75}
                          className="transition-transform duration-300 group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </section>
      )}

      <ContactCta heading={t(`items.${key}.title`)} />
    </div>
  );
}
