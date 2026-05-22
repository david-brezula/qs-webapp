import { useTranslations } from "next-intl";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import type { ServiceSlug, ServiceInternalPath } from "@/lib/services";

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
      className="lift group relative flex flex-col rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-7 hover:border-[var(--color-ink)]/40"
    >
      <Icon size={24} strokeWidth={1.5} className="text-[var(--color-fjord)]" />
      <h3 className="mt-5 text-[1.1875rem] font-semibold text-[var(--color-ink)]">
        {t("name")}
      </h3>
      <p className="mt-2 flex-1 text-[0.9375rem] leading-[1.55] text-[var(--color-slate)]">
        {t("tagline")}
      </p>
      <ArrowRight
        size={18}
        strokeWidth={1.5}
        className="mt-6 text-[var(--color-slate)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--color-ink)]"
      />
    </Link>
  );
}
