"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";

type ProjectRow = {
  projectId: string;
  projectName: string;
  earnings: number;
  accommodation: number;
  wage: number;
  breakdown: { tie: number; connect: number };
};

type Result = {
  total: {
    earnings: number;
    accommodation: number;
    wage: number;
    breakdown: { tie: number; connect: number };
    warnings: string[];
  };
  byProject: ProjectRow[];
  mixedCurrencies: boolean;
};

export function MyWagesView({
  from,
  to,
  result,
}: {
  from: string;
  to: string;
  result: Result;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations("wages");
  const tCommon = useTranslations("common");
  const [f, setF] = useState(from);
  const [tt, setTt] = useState(to);

  function apply() {
    const params = new URLSearchParams(sp);
    params.set("from", f);
    params.set("to", tt);
    router.push(`/wages?${params.toString()}`);
  }

  const hasTotal =
    result.total.earnings !== 0 || result.total.accommodation !== 0;

  const rows: string[][] = result.byProject.map((p) => [
    p.projectName,
    p.breakdown.tie.toFixed(2),
    p.breakdown.connect.toFixed(2),
    p.earnings.toFixed(2),
    p.accommodation.toFixed(2),
    p.wage.toFixed(2),
  ]);
  if (hasTotal) {
    rows.push([
      tCommon("total"),
      result.total.breakdown.tie.toFixed(2),
      result.total.breakdown.connect.toFixed(2),
      result.total.earnings.toFixed(2),
      result.total.accommodation.toFixed(2),
      result.total.wage.toFixed(2),
    ]);
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end mb-6">
        <div className="w-full sm:w-auto">
          <label className="text-xs text-muted block mb-1">{t("from")}</label>
          <input type="date" value={f} onChange={(e) => setF(e.target.value)} className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </div>
        <div className="w-full sm:w-auto">
          <label className="text-xs text-muted block mb-1">{t("to")}</label>
          <input type="date" value={tt} onChange={(e) => setTt(e.target.value)} className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </div>
        <Button onClick={apply} variant="primary" className="w-full sm:w-auto">{t("calculate")}</Button>
      </div>

      {result.mixedCurrencies && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("mixedCurrencies")}
        </p>
      )}
      {result.total.warnings.includes("missing-price") && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      <DataTable
        headers={[t("project"), t("tie"), t("connect"), t("earnings"), t("accommodation"), t("wage")]}
        empty={t("noData")}
        rows={rows}
      />
    </>
  );
}
