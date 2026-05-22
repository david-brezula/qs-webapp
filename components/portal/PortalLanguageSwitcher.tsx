"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Globe, Check, ChevronDown } from "lucide-react";
import { routing, localeLabels, type Locale } from "@/lib/i18n/routing";
import { updateUserLocale } from "@/lib/actions/locale";

// Portal locale switcher. Portal slugs are identical across locales, so it just
// swaps the leading locale segment of the current path; it also persists the
// choice to the user's account (best-effort). Works on any portal route,
// including dynamic ones, and on the pre-auth login/change-password pages.
export function PortalLanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const segments = pathname.split("/");
  const current = (routing.locales as readonly string[]).includes(segments[1])
    ? (segments[1] as Locale)
    : routing.defaultLocale;

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
    if (next === current) return;
    const parts = pathname.split("/");
    if ((routing.locales as readonly string[]).includes(parts[1])) {
      parts[1] = next;
    } else {
      parts.splice(1, 0, next);
    }
    const dest = parts.join("/") || `/${next}`;
    start(async () => {
      await updateUserLocale(next);
      router.replace(dest);
      router.refresh();
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
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-ink hover:text-navy disabled:opacity-60"
      >
        <Globe size={14} strokeWidth={1.5} />
        <span className="uppercase tracking-wide">{current}</span>
        <ChevronDown
          size={13}
          strokeWidth={1.5}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-2 min-w-[10rem] rounded-lg border border-border-soft bg-surface py-1 shadow-lg"
        >
          {routing.locales.map((l) => (
            <li key={l} role="option" aria-selected={l === current}>
              <button
                type="button"
                onClick={() => switchTo(l)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-slate-ink hover:bg-bg hover:text-navy"
              >
                <span>{localeLabels[l]}</span>
                {l === current && <Check size={14} strokeWidth={2} className="text-accent" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
