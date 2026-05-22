import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <div className="min-h-[60vh] grid place-items-center px-6">
      <div className="text-center">
        <p className="font-display text-[5rem] leading-none font-bold text-[var(--color-rule)]">
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold text-[var(--color-ink)]">
          {t("title")}
        </h1>
        <p className="mt-3 text-[var(--color-slate)]">{t("description")}</p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-fjord)] transition-colors"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
