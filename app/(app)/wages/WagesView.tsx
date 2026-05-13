"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";

type Row = {
  userId: string;
  name: string;
  earnings: number;
  accommodation: number;
  wage: number;
  breakdown: { tie: number; connect: number };
  warnings: string[];
};

export function WagesView({
  from,
  to,
  projectId,
  projects,
  result,
}: {
  from: string;
  to: string;
  projectId: string;
  projects: { id: string; name: string }[];
  result: { rows: Row[]; mixedCurrencies: boolean };
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations("wages");
  const [f, setF] = useState(from);
  const [tt, setTt] = useState(to);
  const [pid, setPid] = useState(projectId);

  function apply() {
    const params = new URLSearchParams(sp);
    params.set("from", f);
    params.set("to", tt);
    if (pid) params.set("projectId", pid);
    else params.delete("projectId");
    router.push(`/wages?${params.toString()}`);
  }

  function exportCsv() {
    const params = new URLSearchParams();
    params.set("from", f);
    params.set("to", tt);
    if (pid) params.set("projectId", pid);
    window.location.href = `/wages/export.csv?${params.toString()}`;
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 items-end mb-6">
        <div>
          <label className="text-xs text-muted block mb-1">{t("from")}</label>
          <input type="date" value={f} onChange={(e) => setF(e.target.value)} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">{t("to")}</label>
          <input type="date" value={tt} onChange={(e) => setTt(e.target.value)} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">{t("projectFilter")}</label>
          <select value={pid} onChange={(e) => setPid(e.target.value)} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm min-w-[200px]">
            <option value="">{t("all")}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Button onClick={apply} variant="primary">{t("calculate")}</Button>
        <Button onClick={exportCsv} variant="secondary">{t("exportCsv")}</Button>
      </div>

      {result.mixedCurrencies && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("mixedCurrencies")}
        </p>
      )}

      <DataTable
        headers={["Worker", "Tie", "Connect", t("earnings"), t("accommodation"), t("wage"), "Notes"]}
        empty={t("noData")}
        rows={result.rows
          .filter((r) => r.earnings !== 0 || r.accommodation !== 0)
          .map((r) => [
            r.name,
            r.breakdown.tie.toFixed(2),
            r.breakdown.connect.toFixed(2),
            r.earnings.toFixed(2),
            r.accommodation.toFixed(2),
            r.wage.toFixed(2),
            r.warnings.includes("missing-price") ? t("missingPrice") : "",
          ])}
      />
    </>
  );
}
