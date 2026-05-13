"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { changePasswordAction } from "@/lib/actions/auth";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const t = useTranslations("changePassword");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await changePasswordAction(fd);
      if (r.ok) {
        setSuccess(true);
        if (forced) {
          // First-login flow: continue into the portal.
          setTimeout(() => router.push("/dashboard"), 600);
        }
      } else {
        setErrors(r.fieldErrors ?? { _form: r.error });
      }
    });
  }

  if (success && !forced) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-navy font-semibold">{t("success")}</p>
        <Button href="/dashboard" variant="primary" className="w-full">
          {t("continue")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field name="currentPassword" label={t("current")} autoComplete="current-password" error={errors.currentPassword} />
      <Field name="newPassword" label={t("new")} autoComplete="new-password" error={errors.newPassword} />
      <Field name="confirmPassword" label={t("confirm")} autoComplete="new-password" error={errors.confirmPassword} />

      {errors._form && (
        <p role="alert" aria-live="polite" className="text-sm text-red-600">
          {errors._form}
        </p>
      )}
      {success && forced && (
        <p role="alert" aria-live="polite" className="text-sm text-navy font-semibold">
          {t("success")}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {pending ? tCommon("loading") : t("submit")}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  autoComplete,
  error,
}: {
  name: string;
  label: string;
  autoComplete: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-navy block mb-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
