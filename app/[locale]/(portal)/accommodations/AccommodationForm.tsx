"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { FormSelect } from "@/components/portal/FormSelect";
import {
  saveAccommodationAction,
  deleteAccommodationAction,
} from "@/lib/actions/accommodations";

export function AccommodationForm({
  initial,
  workers,
  projects,
  selectedWorkerIds,
}: {
  initial?: {
    id: string;
    projectId: string | null;
    name: string;
    startDate: string;
    endDate: string;
    totalCost: number;
    currency: "USD" | "EUR";
    notes: string | null;
  };
  workers: { id: string; name: string; email: string }[];
  projects: { id: string; name: string }[];
  selectedWorkerIds: string[];
}) {
  const router = useRouter();
  const t = useTranslations("accommodations");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedWorkerIds));
  const [formError, setFormError] = useState<string | null>(null);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    if (initial?.id) fd.set("id", initial.id);
    for (const id of selected) fd.append("workerIds", id);
    start(async () => {
      const r = await saveAccommodationAction(fd);
      if (r.ok) {
        router.push("/accommodations");
      } else {
        setFormError(tCommon("saveError"));
      }
    });
  }

  function onDelete() {
    if (!initial?.id) return;
    setFormError(null);
    const fd = new FormData();
    fd.set("id", initial.id);
    start(async () => {
      const r = await deleteAccommodationAction(fd);
      if (r.ok) {
        router.push("/accommodations");
      } else {
        setFormError(tCommon("deleteError"));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-2xl" noValidate>
      <FormField label={tCommon("name")} name="name" defaultValue={initial?.name} required />
      <FormSelect
        label="Project"
        name="projectId"
        defaultValue={initial?.projectId ?? ""}
        options={[{ value: "", label: "— none —" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t("startDate")} name="startDate" type="date" defaultValue={initial?.startDate} required />
        <FormField label={t("endDate")} name="endDate" type="date" defaultValue={initial?.endDate} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t("totalCost")} name="totalCost" type="number" step="0.01" defaultValue={initial?.totalCost} required />
        <FormSelect
          label={tCommon("currency")}
          name="currency"
          defaultValue={initial?.currency ?? "USD"}
          options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }]}
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-navy block mb-2">Workers</label>
        <div className="grid gap-2 sm:grid-cols-2 max-h-72 overflow-auto border border-border-soft rounded-md p-3 bg-bg">
          {workers.map((w) => (
            <label key={w.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.has(w.id)} onChange={() => toggle(w.id)} />
              <span>{w.name} <span className="text-muted text-xs">{w.email}</span></span>
            </label>
          ))}
        </div>
      </div>
      <FormField label={tCommon("notes")} name="notes" defaultValue={initial?.notes ?? ""} />

      {formError && (
        <p role="alert" className="text-sm text-red-600">{formError}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {tCommon("save")}
        </Button>
        {initial?.id && (
          <Button onClick={onDelete} variant="secondary" disabled={pending}>
            {tCommon("delete")}
          </Button>
        )}
      </div>
    </form>
  );
}
