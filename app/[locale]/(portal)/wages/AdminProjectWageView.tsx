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
  companyEarnings: number;
  profit: number;
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
  profit: number;
  warnings: string[];
};

type ProjectTotals = {
  companyEarnings: number;
  earnings: number;
  profit: number;
  accommodationReturned: number;
};

function NumCell({ value }: { value: number }) {
  return <div className="font-semibold text-navy">{value.toFixed(2)}</div>;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-md border border-border-soft bg-surface px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-navy/60">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${accent ? "text-emerald-700" : "text-navy"}`}>
        {value.toFixed(2)}
      </div>
    </div>
  );
}

export function AdminProjectWageView({
  projectId,
  sections,
  workers,
  capacity,
  mixedCurrencies,
  totals,
}: {
  projectId: string;
  sections: SectionRow[];
  workers: WorkerRow[];
  capacity: number;
  mixedCurrencies: boolean;
  totals: ProjectTotals;
}) {
  const t = useTranslations("wages");
  const tProjects = useTranslations("portalProjects");
  const tCommon = useTranslations("common");

  const hasMissingPrice = workers.some((w) => w.warnings.includes("missing-price"));
  const hasMissingCompanyPrice = workers.some((w) => w.warnings.includes("missing-company-price"));

  return (
    <>
      <p className="text-sm text-muted mb-4">{t("capacityTotal", { count: capacity })}</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("companyEarnings")} value={totals.companyEarnings} />
        <StatCard label={t("earnings")} value={totals.earnings} />
        <StatCard label={t("profit")} value={totals.profit} accent />
        <StatCard label={t("accommodationReturned")} value={totals.accommodationReturned} />
      </div>

      {mixedCurrencies && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("mixedCurrencies")}
        </p>
      )}
      {hasMissingCompanyPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingCompanyPrice")}
        </p>
      )}
      {hasMissingPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      <h2 className="text-lg font-semibold text-navy mt-6 mb-3">{t("sections")}</h2>
      <DataTable
        headers={[tProjects("section"), t("modules"), t("capacity"), t("earnings"), t("companyEarnings"), t("profit")]}
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
          <NumCell key={`ear-${s.id}`} value={s.earnings} />,
          <NumCell key={`cme-${s.id}`} value={s.companyEarnings} />,
          <NumCell key={`pro-${s.id}`} value={s.profit} />,
        ])}
      />

      <h2 className="text-lg font-semibold text-navy mt-10 mb-3">{t("workersSummary")}</h2>
      <DataTable
        headers={[
          tCommon("name"),
          t("modules"),
          t("earnings"),
          t("accommodation"),
          t("wage"),
          t("profit"),
        ]}
        empty={t("noActivityYet")}
        rows={workers.map((w) => [
          w.name,
          <ModulesCell key={`mod-${w.userId}`} tied={w.tieCount} connected={w.connectCount} />,
          <NumCell key={`ear-${w.userId}`} value={w.earnings} />,
          <NumCell key={`acc-${w.userId}`} value={w.accommodation} />,
          <NumCell key={`wag-${w.userId}`} value={w.wage} />,
          <NumCell key={`pro-${w.userId}`} value={w.profit} />,
        ])}
      />
    </>
  );
}
