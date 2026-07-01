"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updateProjectCompanyRateAction } from "@/lib/actions/projects";

export function CompanyRatePanel({
  projectId,
  companyPriceTie,
  companyPriceConnect,
  labels,
}: {
  projectId: string;
  companyPriceTie: number;
  companyPriceConnect: number;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tie, setTie] = useState(String(companyPriceTie));
  const [connect, setConnect] = useState(String(companyPriceConnect));

  function save() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("companyPriceTie", tie || "0");
    fd.set("companyPriceConnect", connect || "0");
    start(async () => {
      await updateProjectCompanyRateAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="grid max-w-3xl grid-cols-3 items-end gap-2">
      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-navy/60">
        {labels.companyPriceTie}
        <input
          value={tie}
          onChange={(e) => setTie(e.target.value)}
          type="number"
          step="0.01"
          min="0"
          className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm text-navy"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-navy/60">
        {labels.companyPriceConnect}
        <input
          value={connect}
          onChange={(e) => setConnect(e.target.value)}
          type="number"
          step="0.01"
          min="0"
          className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm text-navy"
        />
      </label>
      <Button onClick={save} variant="primary" disabled={pending}>
        {labels.save}
      </Button>
    </div>
  );
}
