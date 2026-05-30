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
      className="lift group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-7 hover:border-[var(--accent)]"
    >
      {/* Trade accent bar that grows on hover */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-300 group-hover:scale-x-100"
      />
      <span className="grid place-items-center h-12 w-12 rounded-[var(--radius-card)] bg-[var(--accent-tint)]">
        <Icon size={24} strokeWidth={1.5} className="text-[var(--accent)]" />
      </span>
      <h3 className="mt-5 text-[1.1875rem] font-semibold text-[var(--color-ink)]">
        {t("name")}
      </h3>
      <p className="mt-2 flex-1 text-[0.9375rem] leading-[1.55] text-[var(--color-slate)]">
        {t("tagline")}
      </p>
      <ArrowRight
        size={18}
        strokeWidth={1.5}
        className="mt-6 text-[var(--color-slate)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--accent)]"
      />
    </Link>
  );
}
