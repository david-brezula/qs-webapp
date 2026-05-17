"use client";

import { useTranslations } from "next-intl";
import { LocaleToggle } from "@/components/portal/LocaleToggle";
import { MobileNav } from "@/components/portal/MobileNav";

export function TopBar({
  name,
  email,
  language,
  role,
  signOutAction,
}: {
  name: string;
  email: string;
  language: "en" | "sk";
  role: "ADMIN" | "WORKER";
  signOutAction: () => Promise<void>;
}) {
  const t = useTranslations("nav");

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border-soft bg-surface px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav role={role} />
        <div className="min-w-0 truncate text-sm text-slate-ink">
          <span className="font-semibold text-navy">{name}</span>
          <span className="ml-2 text-xs text-muted">{email}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 md:gap-4">
        <LocaleToggle current={language} />
        <form action={signOutAction}>
          <button
            type="submit"
            className="whitespace-nowrap text-sm text-slate-ink hover:text-navy"
          >
            {t("signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
