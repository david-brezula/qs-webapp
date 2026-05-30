import { useTranslations } from "next-intl";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import type { ServiceSlug, ServiceInternalPath } from "@/lib/services";
import { tradeAccent } from "@/lib/trades";

export function ServiceCard({
  slug,
  internalPath,
  Icon,
}: {
  slug: ServiceSlug;
  internalPath: ServiceInternalPath;
  Icon: LucideIcon;
}) {
  const t = useTranslations(`services.${slug}`);

  return (
    <Link
      href={internalPath}
      style={tradeAccent(slug)}
      className="lift group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-7 shadow-[var(--shadow-card)] hover:border-[var(--color-ink)]/15 hover:shadow-[var(--shadow-float)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]"
    >
      {/* Trade accent bar — revealed on hover only. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-300 group-hover:scale-x-100"
      />
      {/* Icon chip: neutral at rest, trade tint on hover. */}
      <span className="relative grid h-12 w-12 place-items-center rounded-[var(--radius-card)] bg-[var(--color-paper-2)] transition-colors duration-300 group-hover:bg-[var(--accent-tint)]">
        <Icon
          size={24}
          strokeWidth={1.5}
          className="text-[var(--color-slate)] transition-colors duration-300 group-hover:text-[var(--accent)]"
        />
      </span>
      <h3 className="relative mt-5 text-[1.1875rem] font-semibold text-[var(--color-ink)]">
        {t("name")}
      </h3>
      <p className="relative mt-2 flex-1 text-[0.9375rem] leading-[1.55] text-[var(--color-slate)]">
        {t("tagline")}
      </p>
      <ArrowRight
        size={18}
        strokeWidth={1.5}
        className="relative mt-6 text-[var(--color-mist)] transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-[var(--accent)]"
      />
    </Link>
  );
}
