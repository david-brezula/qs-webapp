"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { TradeImage } from "./TradeImage";
import { FEATURED_PROJECTS, type FeaturedProject, type ProjectStatus } from "@/lib/projects";
import { SERVICES, type ServiceSlug } from "@/lib/services";
import { PROJECT_IMAGE } from "@/lib/marketingImages";

type Filter = "all" | ServiceSlug;

const STATUS_STYLE: Record<ProjectStatus, string> = {
  completed: "bg-[var(--trade-roofing-tint)] text-[var(--status-completed)]",
  inProgress: "bg-[var(--trade-solar-tint)] text-[var(--status-progress)]",
  planned: "bg-[var(--color-paper-2)] text-[var(--status-planned)]",
};

// Filterable grid of project cards, each linking to its case study. Shared by the
// homepage Portfolio section and the /work index page. Card copy lives in the
// `projects.items.<key>` message namespace; status labels in
// `home.featuredProjects.status`.
export function ProjectGrid({
  projects = [...FEATURED_PROJECTS],
}: {
  projects?: FeaturedProject[];
}) {
  const t = useTranslations("projects");
  const tStatus = useTranslations("home.featuredProjects");
  const tServices = useTranslations("services");
  const [filter, setFilter] = useState<Filter>("all");
  const reduce = useReducedMotion();

  const tabs: Filter[] = ["all", ...SERVICES.map((s) => s.slug)];
  const visible = projects.filter(
    (p) => filter === "all" || p.trade === filter,
  );

  return (
    <div>
      {/* Trade filter tabs with a sliding active indicator. */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={tStatus("title")}
      >
        {tabs.map((tab) => {
          const active = filter === tab;
          const label = tab === "all" ? tStatus("allLabel") : tServices(`${tab}.name`);
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab)}
              className={`relative rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] ${
                active
                  ? "border-[var(--color-ink)] text-[var(--color-paper)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-slate)] hover:border-[var(--color-ink)]/40 hover:text-[var(--color-ink)]"
              }`}
            >
              {active &&
                (reduce ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-[var(--color-ink)]"
                  />
                ) : (
                  <motion.span
                    layoutId="pf-tab-indicator"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-[var(--color-ink)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ))}
              <span className="relative z-[1]">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Project cards — crossfade between filters. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={reduce ? {} : { opacity: 1, y: 0 }}
          exit={reduce ? {} : { opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map(({ key, slug, trade, status }) => (
            <Link
              key={key}
              href={{ pathname: "/work/[slug]", params: { slug } }}
              className="lift group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] shadow-[var(--shadow-card)] transition-colors hover:border-[var(--color-ink)]/15 hover:shadow-[var(--shadow-float)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]"
            >
              <TradeImage
                trade={trade}
                src={PROJECT_IMAGE[key]}
                alt={t(`items.${key}.title`)}
                ratio="aspect-[16/10]"
                label={tServices(`${trade}.name`)}
                className="border-b border-[var(--color-rule)]"
              />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-slate)]">
                    {tServices(`${trade}.name`)}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${STATUS_STYLE[status]}`}
                  >
                    {tStatus(`status.${status}`)}
                  </span>
                </div>
                <h3 className="mt-3 text-[1.0625rem] font-semibold text-[var(--color-ink)]">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-1 text-[0.8125rem] text-[var(--color-mist)]">
                  {t(`items.${key}.location`)}
                </p>
                <p className="mt-3 text-[0.9375rem] leading-[1.55] text-[var(--color-slate)]">
                  {t(`items.${key}.summary`)}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--color-ink)]">
                  {t("viewCase")}
                  <ArrowRight
                    size={14}
                    strokeWidth={1.75}
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </Link>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
