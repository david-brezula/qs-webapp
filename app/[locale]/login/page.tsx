"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, Building2, HardHat } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PortalLanguageSwitcher } from "@/components/portal/PortalLanguageSwitcher";
import { loginAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  // In production the marketing landing lives on a different host
  // (NEXT_PUBLIC_SITE_URL); in dev it's the same host. Plain anchor either way.
  const homeHref = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${locale}`;
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Theme the login by intent: clients arrive via /portal (-> ?from=/portal),
  // staff via the work portal. Distinct background, glow, accent, and label.
  const isClientLogin = /(^|\/)portal(\/|$)/.test(params.get("from") ?? "");
  const theme = isClientLogin
    ? {
        // Client: bright, welcoming accent canvas.
        pageBg:
          "linear-gradient(160deg, color-mix(in srgb, var(--color-accent) 16%, var(--color-bg)) 0%, color-mix(in srgb, var(--color-accent) 46%, var(--color-bg)) 100%)",
        overlay:
          "radial-gradient(70% 55% at 50% -10%, color-mix(in srgb, var(--color-accent) 42%, white), transparent 60%)",
        accent: "var(--color-accent)",
        onBg: "text-slate-ink hover:text-navy",
        cardShadow: "0 30px 60px -24px color-mix(in srgb, var(--color-accent) 50%, transparent)",
        label: tNav("clientPortal"),
        Icon: Building2,
      }
    : {
        // Work: dark, industrial navy canvas with a faint blueprint grid.
        pageBg:
          "linear-gradient(160deg, color-mix(in srgb, var(--color-navy), black 6%) 0%, color-mix(in srgb, var(--color-navy), black 52%) 100%)",
        overlay:
          "radial-gradient(70% 50% at 50% -8%, color-mix(in srgb, var(--color-accent) 28%, transparent), transparent 58%), repeating-linear-gradient(0deg, transparent 0 39px, rgba(255,255,255,0.05) 39px 40px), repeating-linear-gradient(90deg, transparent 0 39px, rgba(255,255,255,0.05) 39px 40px)",
        accent: "var(--color-accent)",
        onBg: "text-white/70 hover:text-white",
        cardShadow: "0 35px 70px -25px rgba(0,0,0,0.6)",
        label: tNav("portal"),
        Icon: HardHat,
      };
  const PortalIcon = theme.Icon;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await loginAction(fd);
      if (r.ok) {
        const from = params.get("from");
        const safeFrom = (() => {
          if (!from) return null;
          try {
            const url = new URL(from, window.location.origin);
            return url.origin === window.location.origin ? from : null;
          } catch {
            return null;
          }
        })();
        router.push(safeFrom ?? (r.locale ? `/${r.locale}/dashboard` : "/dashboard"));
        router.refresh();
      } else if (r.error === "validation") {
        setErrors(r.fieldErrors ?? {});
      } else {
        setFormError(t("error"));
      }
    });
  }


  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Container className="relative z-10 flex items-center justify-between py-4">
        <a href={homeHref} className="flex items-center gap-2" aria-label={t("backToHome")}>
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--color-navy) 0 50%, var(--color-accent) 50% 100%)",
            }}
          />
          <span className="font-semibold tracking-[0.2em] text-navy text-sm">
            QUANTUM SPHERE
          </span>
        </a>
        <PortalLanguageSwitcher />
      </Container>

      <main
        className="relative flex-1 grid place-items-center overflow-hidden px-6 py-12"
        style={{ background: theme.pageBg }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: theme.overlay }}
        />
        <div className="relative z-10 flex flex-col items-center gap-6">
        <div
          className="w-full max-w-sm bg-surface border border-border-soft rounded-xl p-8"
          style={{ boxShadow: theme.cardShadow }}
        >
          <div className="mb-5 h-1 w-10 rounded-full" style={{ background: theme.accent }} aria-hidden />
          <div
            className="mb-2 inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em]"
            style={{ color: theme.accent }}
          >
            <PortalIcon size={14} strokeWidth={1.75} />
            {theme.label}
          </div>
          <h1 className="text-2xl font-semibold text-navy mb-6">{t("title")}</h1>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="username" className="text-sm font-semibold text-navy block mb-2">
                {tCommon("username")}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(errors.username)}
                className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-600">{errors.username}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-semibold text-navy block mb-2">
                {tCommon("password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>
            {formError && (
              <p role="alert" aria-live="polite" className="text-sm text-red-600">
                {formError}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={pending} className="w-full">
              {pending ? tCommon("loading") : t("submit")}
            </Button>
          </form>
        </div>
          <a
            href={homeHref}
            className={`inline-flex items-center gap-1.5 text-sm transition-colors ${theme.onBg}`}
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            {t("backToHome")}
          </a>
        </div>
      </main>
    </div>
  );
}
