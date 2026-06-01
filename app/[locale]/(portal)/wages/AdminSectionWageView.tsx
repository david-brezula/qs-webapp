"use client";

import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";

type SectionWorkerRow = {
  userId: string;
  name: string;
  tie: number;
  connect: number;
  earnings: number;
  accommodation: number;
  advance: number;
  invoicedAt: string | null;
  warnings: string[];
};

function NumCell({ value }: { value: number }) {
  return <div className="font-semibold text-navy">{value.toFixed(2)}</div>;
}

export function AdminSectionWageView({ workers }: { workers: SectionWorkerRow[] }) {
  const t = useTranslations("wages");
  const tCommon = useTranslations("common");

  const hasMissingPrice = workers.some((w) => w.warnings.includes("missing-price"));

  return (
    <>
      {hasMissingPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      <DataTable
        headers={[tCommon("name"), t("tie"), t("connect"), t("earnings"), t("accommodation"), t("advance"), t("invoiced")]}
        empty={t("noActivityYet")}
        rows={workers.map((w) => [
          w.name,
          <NumCell key={`tie-${w.userId}`} value={w.tie} />,
          <NumCell key={`con-${w.userId}`} value={w.connect} />,
          <NumCell key={`ear-${w.userId}`} value={w.earnings} />,
          <NumCell key={`acc-${w.userId}`} value={w.accommodation} />,
          <NumCell key={`adv-${w.userId}`} value={w.advance} />,
          <span key={`inv-${w.userId}`} className="text-sm text-slate-ink">{w.invoicedAt ? `✓ ${w.invoicedAt.slice(0, 10)}` : "—"}</span>,
        ])}
      />
    </>
  );
}
