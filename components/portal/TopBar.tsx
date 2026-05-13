"use client";

import { useTranslations } from "next-intl";
import { LocaleToggle } from "@/components/portal/LocaleToggle";

export function TopBar({
  name,
  email,
  language,
  signOutAction,
}: {
  name: string;
  email: string;
  language: "en" | "sk";
  signOutAction: () => Promise<void>;
}) {
  const t = useTranslations("nav");

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border-soft bg-surface px-6 py-3">
      <div className="text-sm text-slate-ink">
        <span className="text-navy font-semibold">{name}</span>
        <span className="ml-2 text-muted text-xs">{email}</span>
      </div>
      <div className="flex items-center gap-4">
        <LocaleToggle current={language} />
        <form action={signOutAction}>
          <button type="submit" className="text-sm text-slate-ink hover:text-navy">
            {t("signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
