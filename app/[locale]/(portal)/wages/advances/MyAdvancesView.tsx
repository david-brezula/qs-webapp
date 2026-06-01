"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { FormSelect } from "@/components/portal/FormSelect";
import { DataTable } from "@/components/portal/DataTable";
import { requestAdvanceAction, cancelAdvanceAction } from "@/lib/actions/advances";

type Row = {
  id: string;
  amount: string;
  currency: string;
  note: string | null;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PAID" | "SETTLED";
  requestedAt: string;
  sectionName: string | null;
};

export function MyAdvancesView({ requests }: { requests: Row[] }) {
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
      const r = await requestAdvanceAction(fd);
      if (r.ok) {
        form.reset();
        router.refresh();
      } else {
        setError(tCommon("saveError"));
      }
    });
  }

  function onCancel(id: string) {
    if (!window.confirm(t("confirmCancel"))) return;
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      const r = await cancelAdvanceAction(fd);
      if (r.ok) router.refresh();
      else setError(tCommon("deleteError"));
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="space-y-5 max-w-md" noValidate>
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
        <Button type="submit" variant="primary" disabled={pending}>{t("request")}</Button>
      </form>

      <div>
        <h2 className="text-sm uppercase tracking-[0.15em] font-semibold text-navy/70 mb-3">{t("mine")}</h2>
        <DataTable
          headers={[t("amount"), tCommon("currency"), tCommon("status"), t("section"), t("requestedAt"), t("note"), tCommon("actions")]}
          empty={t("noRequests")}
          rows={requests.map((r) => [
            r.amount,
            r.currency,
            t(`status.${r.status}`),
            r.sectionName ?? "—",
            r.requestedAt,
            r.note ?? "—",
            r.status === "REQUESTED" ? (
              <button onClick={() => onCancel(r.id)} disabled={pending} className="text-red-600 underline">
                {t("cancel")}
              </button>
            ) : "—",
          ])}
        />
      </div>
    </div>
  );
}
