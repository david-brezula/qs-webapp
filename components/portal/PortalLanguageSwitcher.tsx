"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing, localeLabels, type Locale } from "@/lib/i18n/routing";
import { updateUserLocale } from "@/lib/actions/locale";

// Portal locale switcher. Uses next-intl's locale-aware navigation to swap the
// active locale while preserving the current path (portal slugs are identical
// across locales). It also persists the choice to the user's account, but in
// the background — the visible switch must never wait on the DB write. Works on
// any portal route, including dynamic ones, and on the login/change-password
// pages. (NextIntlClientProvider wraps all of them, so the hooks resolve.)
export function PortalLanguageSwitcher() {
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const params = useParams();
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
    if (next === current) return;
    // Persist the preference to the account in the background (best-effort,
    // cross-device); never block the locale switch on this DB write.
    void updateUserLocale(next);
    start(() => {
      // `{pathname, params}` covers dynamic routes; params always match the
      // current pathname at runtime, so the union-type mismatch the compiler
      // flags here cannot actually occur.
      // @ts-expect-error -- params is validated per-pathname; safe for the current route
      router.replace({ pathname, params }, { locale: next });
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
