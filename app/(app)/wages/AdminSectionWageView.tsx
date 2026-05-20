"use client";

import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { WageDateFilter } from "./WageDateFilter";

type SectionWorkerRow = {
  userId: string;
  name: string;
  allTime: { tie: number; connect: number; earnings: number; warnings: string[] };
  range: { tie: number; connect: number; earnings: number };
};

function NumCell({ allTime, range }: { allTime: number; range: number }) {
  return (
    <div>
      <div className="font-semibold text-navy">{allTime.toFixed(2)}</div>
      <div className="text-xs text-muted">{range.toFixed(2)}</div>
    </div>
  );
}

export function AdminSectionWageView({
  from,
  to,
  workers,
}: {
  from: string;
  to: string;
  workers: SectionWorkerRow[];
}) {
  const t = useTranslations("wages");
  const tCommon = useTranslations("common");

  const hasMissingPrice = workers.some((w) => w.allTime.warnings.includes("missing-price"));

  return (
    <>
      <WageDateFilter from={from} to={to} />
      <p className="text-xs text-muted mb-4">{t("allTimeHelper")}</p>

      {hasMissingPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      <DataTable
        headers={[tCommon("name"), t("tie"), t("connect"), t("earnings")]}
        empty={t("noData")}
        rows={workers.map((w) => [
          w.name,
          <NumCell key={`tie-${w.userId}`} allTime={w.allTime.tie} range={w.range.tie} />,
          <NumCell key={`con-${w.userId}`} allTime={w.allTime.connect} range={w.range.connect} />,
          <NumCell key={`ear-${w.userId}`} allTime={w.allTime.earnings} range={w.range.earnings} />,
        ])}
      />
    </>
  );
}
