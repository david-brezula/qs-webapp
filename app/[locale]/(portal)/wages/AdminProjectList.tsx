"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { ModulesCell } from "@/components/portal/ModulesCell";

type ProjectRow = {
  id: string;
  name: string;
  location: string | null;
  status: "ACTIVE" | "CLOSED";
  tie: number;
  connect: number;
  tieCount: number;
  connectCount: number;
  capacity: number;
  accommodation: number;
  wage: number;
  warnings: string[];
};

function NumCell({ value }: { value: number }) {
  return <div className="font-semibold text-navy">{value.toFixed(2)}</div>;
}

export function AdminProjectList({
  projects,
  mixedCurrencies,
}: {
  projects: ProjectRow[];
  mixedCurrencies: boolean;
}) {
  const t = useTranslations("wages");
  const tProjects = useTranslations("portalProjects");
  const tCommon = useTranslations("common");

  const hasMissingPrice = projects.some((p) => p.warnings.includes("missing-price"));

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

      <DataTable
        headers={[
          tProjects("name"),
          tProjects("location"),
          tCommon("status"),
          t("modules"),
          t("capacity"),
          t("tie"),
          t("connect"),
          t("accommodation"),
          t("wage"),
        ]}
        empty={tProjects("noProjects")}
        rows={projects.map((p) => [
          <Link
            key={p.id}
            href={`/wages/projects/${p.id}`}
            className="text-navy font-medium hover:underline"
          >
            {p.name}
          </Link>,
          p.location ?? "",
          p.status === "ACTIVE" ? tCommon("active") : tCommon("closed"),
          <ModulesCell key={`mod-${p.id}`} tied={p.tieCount} connected={p.connectCount} />,
          <span key={`cap-${p.id}`} className="text-sm text-slate-ink">{p.capacity}</span>,
          <NumCell key={`tie-${p.id}`} value={p.tie} />,
          <NumCell key={`con-${p.id}`} value={p.connect} />,
          <NumCell key={`acc-${p.id}`} value={p.accommodation} />,
          <NumCell key={`wag-${p.id}`} value={p.wage} />,
        ])}
      />
    </>
  );
}
