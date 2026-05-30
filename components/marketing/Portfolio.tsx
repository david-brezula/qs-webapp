"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TradeImagePlaceholder } from "./TradeImagePlaceholder";
import { FEATURED_PROJECTS, type ProjectStatus } from "@/lib/projects";
import { SERVICES, type ServiceSlug } from "@/lib/services";

type Filter = "all" | ServiceSlug;

const STATUS_STYLE: Record<ProjectStatus, string> = {
  completed: "bg-[var(--trade-roofing-tint)] text-[var(--status-completed)]",
  inProgress: "bg-[var(--trade-solar-tint)] text-[var(--status-progress)]",
  planned: "bg-[var(--color-paper-2)] text-[var(--status-planned)]",
};

export function Portfolio() {
  const t = useTranslations("home.featuredProjects");
  const tServices = useTranslations("services");
  const [filter, setFilter] = useState<Filter>("all");

  const tabs: Filter[] = ["all", ...SERVICES.map((s) => s.slug)];
  const visible = FEATURED_PROJECTS.filter(
    (p) => filter === "all" || p.trade === filter,
  );

  return (
    <section className="border-y border-[var(--color-rule)] bg-[var(--color-canvas)]">
      <Container className="py-20 md:py-28">
        <SectionHeading title={t("title")} lede={t("subtitle")} />

        {/* Trade filter tabs */}
        <div className="mt-10 flex flex-wrap gap-2" role="tablist" aria-label={t("title")}>
          {tabs.map((tab) => {
            const active = filter === tab;
            const label = tab === "all" ? t("allLabel") : tServices(`${tab}.name`);
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab)}
                className={`rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition-colors ${
                  active
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                    : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-slate)] hover:border-[var(--color-ink)]/40 hover:text-[var(--color-ink)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Project cards */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ key, trade, status }) => (
            <article
              key={key}
              className="lift flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)]"
            >
              <TradeImagePlaceholder
                trade={trade}
                ratio="aspect-[16/10]"
                className="border-b border-[var(--color-rule)]"
              />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="eyebrow text-[var(--color-slate)]">
                    {tServices(`${trade}.name`)}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${STATUS_STYLE[status]}`}
                  >
                    {t(`status.${status}`)}
                  </span>
                </div>
                <h3 className="mt-3 text-[1.0625rem] font-semibold text-[var(--color-ink)]">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-1 text-[0.8125rem] text-[var(--color-mist)]">
                  {t(`items.${key}.location`)}
                </p>
                <p className="mt-3 text-[0.9375rem] leading-[1.55] text-[var(--color-slate)]">
                  {t(`items.${key}.body`)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
