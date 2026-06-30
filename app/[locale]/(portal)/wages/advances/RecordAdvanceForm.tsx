"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { FormSelect } from "@/components/portal/FormSelect";
import { createAdvanceForWorkerAction } from "@/lib/actions/advances";

type Worker = { id: string; name: string };

export function RecordAdvanceForm({ workers }: { workers: Worker[] }) {
  const t = useTranslations("advances");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    start(async () => {
      const r = await createAdvanceForWorkerAction(fd);
      if (r.ok) {
        form.reset();
        router.refresh();
      } else {
        setError(tCommon("saveError"));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-md" noValidate>
      <FormSelect
        label={t("worker")}
        name="userId"
        defaultValue=""
        options={[
          { value: "", label: `— ${t("selectWorker")} —` },
          ...workers.map((w) => ({ value: w.id, label: w.name })),
        ]}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("amount")} name="amount" type="number" step="0.01" required />
        <FormSelect
          label={tCommon("currency")}
          name="currency"
          defaultValue="EUR"
          options={[{ value: "EUR", label: "EUR" }, { value: "USD", label: "USD" }]}
        />
      </div>
      <FormField label={t("note")} name="note" />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" variant="primary" disabled={pending}>{t("record")}</Button>
    </form>
  );
}
