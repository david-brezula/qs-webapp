"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { getPortalNavItems } from "@/lib/portal-nav";

export function Sidebar({ role }: { role: "ADMIN" | "WORKER" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = getPortalNavItems(role);

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border-soft bg-surface min-h-screen">
      <div className="p-5 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--color-navy) 0 50%, var(--color-accent) 50% 100%)",
            }}
          />
          <span className="font-semibold tracking-[0.2em] text-navy text-sm">
            PORTAL
          </span>
        </div>
      </div>
      <nav className="flex flex-col p-2 gap-1">
        {items.map((i) => {
          const active =
            pathname === i.href || pathname.startsWith(i.href + "/");
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`px-3 py-2 text-sm rounded-md ${
                active
                  ? "bg-bg text-navy font-medium"
                  : "text-slate-ink hover:bg-bg hover:text-navy"
              }`}
            >
              {t(i.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
