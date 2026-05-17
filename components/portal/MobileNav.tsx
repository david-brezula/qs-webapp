"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { getPortalNavItems } from "@/lib/portal-nav";

export function MobileNav({ role }: { role: "ADMIN" | "WORKER" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = getPortalNavItems(role);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="md:hidden -ml-2 p-2 text-navy"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[var(--color-ink)]/40"
          />
          <nav className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border-soft bg-surface">
            <div className="flex items-center gap-2 border-b border-border-soft p-5">
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
            <div className="flex flex-col gap-1 p-2">
              {items.map((i) => {
                const active =
                  pathname === i.href || pathname.startsWith(i.href + "/");
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-md px-3 py-2 text-sm ${
                      active
                        ? "bg-bg text-navy font-medium"
                        : "text-slate-ink hover:bg-bg hover:text-navy"
                    }`}
                  >
                    {t(i.labelKey)}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
