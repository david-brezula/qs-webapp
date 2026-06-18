"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { ModulesCell } from "@/components/portal/ModulesCell";

type SectionRow = {
  id: string;
  name: string;
  tie: number;
  connect: number;
  tieCount: number;
  connectCount: number;
  capacity: number;
  earnings: number;
};

type WorkerRow = {
  userId: string;
  name: string;
  tie: number;
  connect: number;
  tieCount: number;
  connectCount: number;
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
  capacity,
  mixedCurrencies,
}: {
  projectId: string;
  sections: SectionRow[];
  workers: WorkerRow[];
  capacity: number;
  mixedCurrencies: boolean;
}) {
  const t = useTranslations("wages");
  const tProjects = useTranslations("portalProjects");
  const tCommon = useTranslations("common");

  const hasMissingPrice = workers.some((w) => w.warnings.includes("missing-price"));

  return (
    <>
      <p className="text-sm text-muted mb-4">{t("capacityTotal", { count: capacity })}</p>

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
        headers={[tProjects("section"), t("modules"), t("capacity"), t("tie"), t("connect"), t("earnings")]}
        empty={t("noSections")}
        rows={sections.map((s) => [
          <Link
            key={s.id}
            href={`/wages/projects/${projectId}/sections/${s.id}`}
            className="text-navy hover:underline"
          >
            {s.name}
          </Link>,
          <ModulesCell key={`mod-${s.id}`} tied={s.tieCount} connected={s.connectCount} />,
          <span key={`cap-${s.id}`} className="text-sm text-slate-ink">{s.capacity}</span>,
          <NumCell key={`tie-${s.id}`} value={s.tie} />,
          <NumCell key={`con-${s.id}`} value={s.connect} />,
          <NumCell key={`ear-${s.id}`} value={s.earnings} />,
        ])}
      />

      <h2 className="text-lg font-semibold text-navy mt-10 mb-3">{t("workersSummary")}</h2>
      <DataTable
        headers={[
          tCommon("name"),
          t("modules"),
          t("tie"),
          t("connect"),
          t("earnings"),
          t("accommodation"),
          t("wage"),
        ]}
        empty={t("noActivityYet")}
        rows={workers.map((w) => [
          w.name,
          <ModulesCell key={`mod-${w.userId}`} tied={w.tieCount} connected={w.connectCount} />,
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
