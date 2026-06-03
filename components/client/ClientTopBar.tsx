"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PortalLanguageSwitcher } from "@/components/portal/PortalLanguageSwitcher";

export function ClientTopBar({ name, signOutAction }: { name: string; signOutAction: () => Promise<void> }) {
  const t = useTranslations("clientPortal");
  const tNav = useTranslations("nav");
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border-soft bg-surface px-4 py-3 md:px-8">
      <Link href="/portal" className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-6 w-6 rounded-sm"
          style={{ background: "linear-gradient(135deg, var(--color-navy) 0 50%, var(--color-accent) 50% 100%)" }}
        />
        <span className="font-semibold tracking-[0.2em] text-navy text-sm">{t("title")}</span>
      </Link>
      <div className="flex items-center gap-3 md:gap-4">
        <span className="hidden sm:inline text-sm font-medium text-navy">{name}</span>
        <PortalLanguageSwitcher />
        <form action={signOutAction}>
          <button type="submit" className="whitespace-nowrap text-sm text-slate-ink hover:text-navy">
            {tNav("signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
