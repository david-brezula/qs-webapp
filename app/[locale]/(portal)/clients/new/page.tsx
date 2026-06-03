"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { createClientAction } from "@/lib/actions/clients";

export default function NewClientPage() {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await createClientAction(fd);
      if (r.ok) router.push("/clients");
      else setErrors(r.fieldErrors ?? {});
    });
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-8 text-2xl font-semibold text-navy">{t("new")}</h1>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField label={tCommon("name")} name="name" required error={errors.name} />
        <FormField label={t("company")} name="company" error={errors.company} />
        <FormField label={tCommon("email")} name="email" type="email" error={errors.email} />
        <hr className="border-border-soft" />
        <p className="text-xs text-muted">{t("loginHint")}</p>
        <FormField label={tCommon("username")} name="username" required error={errors.username} />
        <FormField label={tCommon("password")} name="password" type="password" required hint="Min 8 characters" error={errors.password} />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? tCommon("loading") : tCommon("create")}
        </Button>
      </form>
    </div>
  );
}
