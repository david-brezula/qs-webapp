"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { Button } from "@/components/ui/Button";
import { WageDateFilter } from "./WageDateFilter";

type ProjectRow = {
  id: string;
  name: string;
  location: string | null;
  status: "ACTIVE" | "CLOSED";
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

export function AdminProjectList({
  from,
  to,
  projects,
  mixedCurrencies,
}: {
  from: string;
  to: string;
  projects: ProjectRow[];
  mixedCurrencies: boolean;
}) {
  const t = useTranslations("wages");
  const tProjects = useTranslations("projects");
  const tCommon = useTranslations("common");

  // Uses the from/to that the page was rendered with — i.e. the last range
  // the user clicked "Calculate" on. Dates typed into the filter inputs but
  // not yet committed via Calculate are not reflected in the export. This
  // matches the "date range = supplementary info" framing of the page; the
  // primary numbers are all-time and the export is the date-range CSV.
  function exportCsv() {
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    window.location.href = `/wages/export.csv?${params.toString()}`;
  }

  const hasMissingPrice = projects.some((p) => p.allTime.warnings.includes("missing-price"));

  return (
    <>
      <WageDateFilter
        from={from}
        to={to}
        trailing={
          <Button onClick={exportCsv} variant="secondary" className="w-full sm:w-auto">
            {t("exportCsv")}
          </Button>
        }
      />
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

      <DataTable
        headers={[
          tProjects("name"),
          tProjects("location"),
          tCommon("status"),
          t("tie"),
          t("connect"),
          t("accommodation"),
          t("wage"),
        ]}
        empty={tProjects("noProjects")}
        rows={projects.map((p) => [
          <Link
            key={p.id}
            href={`/wages/projects/${p.id}?from=${from}&to=${to}`}
            className="text-navy font-medium hover:underline"
          >
            {p.name}
          </Link>,
          p.location ?? "",
          p.status === "ACTIVE" ? tCommon("active") : tCommon("closed"),
          <NumCell key={`tie-${p.id}`} allTime={p.allTime.tie} range={p.range.tie} />,
          <NumCell key={`con-${p.id}`} allTime={p.allTime.connect} range={p.range.connect} />,
          <NumCell key={`acc-${p.id}`} allTime={p.allTime.accommodation} range={p.range.accommodation} />,
          <NumCell key={`wag-${p.id}`} allTime={p.allTime.wage} range={p.range.wage} />,
        ])}
      />
    </>
  );
}
