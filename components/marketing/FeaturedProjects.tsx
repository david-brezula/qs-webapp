import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FEATURED_PROJECTS } from "@/lib/projects";
import { getService } from "@/lib/services";

export function FeaturedProjects() {
  const t = useTranslations("home.featuredProjects");

  return (
    <section>
      <Container className="py-20 md:py-28">
        <SectionHeading title={t("title")} lede={t("subtitle")} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_PROJECTS.map(({ key, trade }) => {
            const Icon = getService(trade).icon;
            return (
              <div
                key={key}
                className="lift flex flex-col rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-7"
              >
                <span className="grid place-items-center h-10 w-10 rounded-[var(--radius-card)] bg-[var(--color-canvas)] border border-[var(--color-rule)]">
                  <Icon size={20} strokeWidth={1.5} className="text-[var(--color-fjord)]" />
                </span>
                <h3 className="mt-5 text-[1.0625rem] font-semibold text-[var(--color-ink)]">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-1 eyebrow text-[var(--color-slate)]">
                  {t(`items.${key}.location`)}
                </p>
                <p className="mt-3 text-[0.9375rem] leading-[1.55] text-[var(--color-slate)]">
                  {t(`items.${key}.body`)}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
