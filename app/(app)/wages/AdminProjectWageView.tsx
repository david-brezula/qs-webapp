"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { WageDateFilter } from "./WageDateFilter";

type SectionRow = {
  id: string;
  name: string;
  allTime: { tie: number; connect: number; earnings: number };
  range: { tie: number; connect: number; earnings: number };
};

type WorkerRow = {
  userId: string;
  name: string;
  allTime: { tie: number; connect: number; earnings: number; accommodation: number; wage: number; warnings: string[] };
  range: { tie: number; connect: number; earnings: number; accommodation: number; wage: number };
};

function NumCell({ allTime, range }: { allTime: number; range: number }) {
  return (
    <div>
      <div className="font-semibold text-navy">{allTime.toFixed(2)}</div>
      <div className="text-xs text-muted">{range.toFixed(2)}</div>
    </div>
  );
}

export function AdminProjectWageView({
  projectId,
  from,
  to,
  sections,
  workers,
  mixedCurrencies,
}: {
  projectId: string;
  from: string;
  to: string;
  sections: SectionRow[];
  workers: WorkerRow[];
  mixedCurrencies: boolean;
}) {
  const t = useTranslations("wages");
  const tProjects = useTranslations("projects");
  const tCommon = useTranslations("common");

  const hasMissingPrice = workers.some((w) => w.allTime.warnings.includes("missing-price"));

  return (
    <>
      <WageDateFilter from={from} to={to} />
      <p className="text-xs text-muted mb-4">{t("allTimeHelper")}</p>

      {mixedCurrencies && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("mixedCurrencies")}
        </p>
      )}
      {hasMissingPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      <h2 className="text-lg font-semibold text-navy mt-6 mb-3">{t("sections")}</h2>
      <DataTable
        headers={[tProjects("section"), t("tie"), t("connect"), t("earnings")]}
        empty={t("noSections")}
        rows={sections.map((s) => [
          <Link
            key={s.id}
            href={`/wages/projects/${projectId}/sections/${s.id}?from=${from}&to=${to}`}
            className="text-navy hover:underline"
          >
            {s.name}
          </Link>,
          <NumCell key={`tie-${s.id}`} allTime={s.allTime.tie} range={s.range.tie} />,
          <NumCell key={`con-${s.id}`} allTime={s.allTime.connect} range={s.range.connect} />,
          <NumCell key={`ear-${s.id}`} allTime={s.allTime.earnings} range={s.range.earnings} />,
        ])}
      />

      <h2 className="text-lg font-semibold text-navy mt-10 mb-3">{t("workersSummary")}</h2>
      <DataTable
        headers={[
          tCommon("name"),
          t("tie"),
          t("connect"),
          t("earnings"),
          t("accommodation"),
          t("wage"),
        ]}
        empty={t("noData")}
        rows={workers.map((w) => [
          w.name,
          <NumCell key={`tie-${w.userId}`} allTime={w.allTime.tie} range={w.range.tie} />,
          <NumCell key={`con-${w.userId}`} allTime={w.allTime.connect} range={w.range.connect} />,
          <NumCell key={`ear-${w.userId}`} allTime={w.allTime.earnings} range={w.range.earnings} />,
          <NumCell key={`acc-${w.userId}`} allTime={w.allTime.accommodation} range={w.range.accommodation} />,
          <NumCell key={`wag-${w.userId}`} allTime={w.allTime.wage} range={w.range.wage} />,
        ])}
      />
    </>
  );
}
