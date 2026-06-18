"use client";

import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { ModulesCell } from "@/components/portal/ModulesCell";

type SectionWorkerRow = {
  userId: string;
  name: string;
  tie: number;
  connect: number;
  tieCount: number;
  connectCount: number;
  earnings: number;
  accommodation: number;
  advance: number;
  invoicedAt: string | null;
  warnings: string[];
};

function NumCell({ value }: { value: number }) {
  return <div className="font-semibold text-navy">{value.toFixed(2)}</div>;
}

export function AdminSectionWageView({
  workers,
  capacity,
}: {
  workers: SectionWorkerRow[];
  capacity: number;
}) {
  const t = useTranslations("wages");
  const tCommon = useTranslations("common");

  const hasMissingPrice = workers.some((w) => w.warnings.includes("missing-price"));

  return (
    <>
      <p className="text-sm text-muted mb-4">{t("capacityTotal", { count: capacity })}</p>

      {hasMissingPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      <DataTable
        headers={[tCommon("name"), t("modules"), t("tie"), t("connect"), t("earnings"), t("accommodation"), t("advance"), t("invoiced")]}
        empty={t("noActivityYet")}
        rows={workers.map((w) => [
          w.name,
          <ModulesCell key={`mod-${w.userId}`} tied={w.tieCount} connected={w.connectCount} />,
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
