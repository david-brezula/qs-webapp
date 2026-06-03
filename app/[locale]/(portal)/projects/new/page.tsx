"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { createProjectAction } from "@/lib/actions/projects";

export default function NewProjectPage() {
  const t = useTranslations("portalProjects");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await createProjectAction(fd);
      if (r.ok && r.data) router.push(`/projects/${r.data.id}/edit`);
      else setError("validation");
    });
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("new")}</h1>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField label={t("name")} name="name" required error={error ?? undefined} />
        <FormField label={t("location")} name="location" />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? tCommon("loading") : tCommon("create")}
        </Button>
      </form>
    </div>
  );
}
