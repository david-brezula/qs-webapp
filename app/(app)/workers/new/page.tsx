"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { FormSelect } from "@/components/portal/FormSelect";
import { createWorkerAction } from "@/lib/actions/workers";

export default function NewWorkerPage() {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await createWorkerAction(fd);
      if (r.ok) router.push("/workers");
      else setErrors(r.fieldErrors ?? {});
    });
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("new")}</h1>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField
          label={tCommon("username")}
          name="username"
          required
          hint={t("usernameHint")}
          error={errors.username}
        />
        <FormField label={tCommon("name")} name="name" required error={errors.name} />
        <FormField label={tCommon("email")} name="email" type="email" error={errors.email} />
        <FormSelect
          label={t("role")}
          name="role"
          defaultValue="WORKER"
          required
          options={[
            { value: "WORKER", label: t("worker") },
            { value: "ADMIN", label: t("admin") },
          ]}
          error={errors.role}
        />
        <FormSelect
          label={tCommon("language")}
          name="language"
          defaultValue="EN"
          required
          options={[
            { value: "EN", label: "English" },
            { value: "SK", label: "Slovenčina" },
          ]}
          error={errors.language}
        />
        <FormField
          label={tCommon("password")}
          name="password"
          type="password"
          required
          hint="Min 8 characters"
          error={errors.password}
        />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? tCommon("loading") : tCommon("create")}
        </Button>
      </form>
    </div>
  );
}
