"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe, Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing, localeLabels, type Locale } from "@/lib/i18n/routing";

// Swaps the active locale while preserving the current pathname; next-intl maps
// the localized slug per target locale automatically.
export function LanguageSwitcher({
  align = "right",
  placement = "bottom",
}: {
  align?: "left" | "right";
  placement?: "top" | "bottom";
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function switchTo(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    start(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors disabled:opacity-60"
      >
        <Globe size={14} strokeWidth={1.5} />
        <span className="uppercase tracking-wide font-medium">{locale}</span>
        <ChevronDown
          size={13}
          strokeWidth={1.5}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className={`absolute z-50 min-w-[10rem] rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] py-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          } ${placement === "top" ? "bottom-full mb-2" : "mt-2"}`}
        >
          {routing.locales.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <button
                type="button"
                onClick={() => switchTo(l)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[0.8125rem] text-[var(--color-slate)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] transition-colors"
              >
                <span>{localeLabels[l]}</span>
                {l === locale && (
                  <Check size={14} strokeWidth={2} className="text-[var(--color-fjord)]" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
