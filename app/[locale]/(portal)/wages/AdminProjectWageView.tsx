"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";

type SectionRow = {
  id: string;
  name: string;
  tie: number;
  connect: number;
  earnings: number;
};

type WorkerRow = {
  userId: string;
  name: string;
  tie: number;
  connect: number;
  earnings: number;
  accommodation: number;
  wage: number;
  warnings: string[];
};

function NumCell({ value }: { value: number }) {
  return <div className="font-semibold text-navy">{value.toFixed(2)}</div>;
}

export function AdminProjectWageView({
  projectId,
  sections,
  workers,
  mixedCurrencies,
}: {
  projectId: string;
  sections: SectionRow[];
  workers: WorkerRow[];
  mixedCurrencies: boolean;
}) {
  const t = useTranslations("wages");
  const tProjects = useTranslations("projects");
  const tCommon = useTranslations("common");

  const hasMissingPrice = workers.some((w) => w.warnings.includes("missing-price"));

  return (
    <>
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
            href={`/wages/projects/${projectId}/sections/${s.id}`}
            className="text-navy hover:underline"
          >
            {s.name}
          </Link>,
          <NumCell key={`tie-${s.id}`} value={s.tie} />,
          <NumCell key={`con-${s.id}`} value={s.connect} />,
          <NumCell key={`ear-${s.id}`} value={s.earnings} />,
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
        empty={t("noActivityYet")}
        rows={workers.map((w) => [
          w.name,
          <NumCell key={`tie-${w.userId}`} value={w.tie} />,
          <NumCell key={`con-${w.userId}`} value={w.connect} />,
          <NumCell key={`ear-${w.userId}`} value={w.earnings} />,
          <NumCell key={`acc-${w.userId}`} value={w.accommodation} />,
          <NumCell key={`wag-${w.userId}`} value={w.wage} />,
        ])}
      />
    </>
  );
}
