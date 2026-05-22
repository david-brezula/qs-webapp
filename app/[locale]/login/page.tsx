"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PortalLanguageSwitcher } from "@/components/portal/PortalLanguageSwitcher";
import { loginAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-bg flex flex-col">
      <Container className="flex items-center justify-between py-4">
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
            QUANTUM SPHERE
          </span>
        </div>
        <PortalLanguageSwitcher />
      </Container>

      <main className="flex-1 grid place-items-center px-6">
        <div className="w-full max-w-sm bg-surface border border-border-soft rounded-lg p-8">
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
      </main>
    </div>
  );
}
