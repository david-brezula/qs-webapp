"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ModulesCell } from "@/components/portal/ModulesCell";
import type { WageByProjectResult } from "@/lib/portal/wages";
import type { WorkerSectionRow } from "./section-row";
import { toggleSectionInvoiceAction } from "@/lib/actions/section-invoice";
import { WorkerSectionBreakdown } from "./WorkerSectionBreakdown";

export function MyWagesView({
  result,
  openAdvances,
}: {
  result: WageByProjectResult;
  openAdvances: number;
}) {
  const t = useTranslations("wages");
  const tCommon = useTranslations("common");

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [sectionCache, setSectionCache] = useState<Map<string, WorkerSectionRow[]>>(new Map());
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());
  const [sectionErrors, setSectionErrors] = useState<Set<string>>(new Set());
  const [invoicing, setInvoicing] = useState<Set<string>>(new Set());

  async function handleToggle(projectId: string) {
    if (sectionCache.has(projectId)) {
      setExpandedProjects((prev) => {
        const next = new Set(prev);
        if (next.has(projectId)) next.delete(projectId);
        else next.add(projectId);
        return next;
      });
      return;
    }
    setSectionErrors((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
    setLoadingSections((prev) => new Set(prev).add(projectId));
    try {
      const res = await fetch(`/api/wages/projects/${projectId}/sections`);
      if (!res.ok) throw new Error(`sections fetch failed: ${res.status}`);
      const data: { sections: WorkerSectionRow[] } = await res.json();
      setSectionCache((prev) => new Map(prev).set(projectId, data.sections));
      setExpandedProjects((prev) => new Set(prev).add(projectId));
    } catch {
      setSectionErrors((prev) => new Set(prev).add(projectId));
    } finally {
      setLoadingSections((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  }

  function handleInvoiceToggle(projectId: string, sectionId: string) {
    if (invoicing.has(sectionId)) return;
    setInvoicing((prev) => new Set(prev).add(sectionId));
    const fd = new FormData();
    fd.set("sectionId", sectionId);
    void (async () => {
      try {
        const r = await toggleSectionInvoiceAction(fd);
        if (!r.ok) return;
        setSectionCache((prev) => {
          const next = new Map(prev);
          const rows = (next.get(projectId) ?? []).map((row) =>
            row.sectionId === sectionId ? { ...row, invoiced: r.invoiced, invoicedAt: r.invoicedAt } : row,
          );
          next.set(projectId, rows);
          return next;
        });
      } finally {
        setInvoicing((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });
      }
    })();
  }

  const hasTotal = result.total.earnings !== 0 || result.total.accommodation !== 0 || openAdvances !== 0;

  return (
    <>
      <p className="text-sm text-muted mb-4">{t("invoiceableHint")}</p>

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

      {result.byProject.length === 0 ? (
        <div className="rounded-md border border-border-soft bg-surface p-8 text-center text-sm text-muted">
          {t("noData")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border-soft bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("project")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("modules")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("earnings")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("accommodation")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("advance")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("invoiceable")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {result.byProject.map((p) => (
                <Fragment key={p.projectId}>
                  <tr
                    className="hover:bg-bg/50 cursor-pointer"
                    onClick={() => { void handleToggle(p.projectId); }}
                  >
                    <td className="px-4 py-3 text-muted align-middle">
                      {loadingSections.has(p.projectId) ? (
                        <span className="text-xs">…</span>
                      ) : expandedProjects.has(p.projectId) ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.projectName}</td>
                    <td className="px-4 py-3 align-middle">
                      <ModulesCell tied={p.breakdown.tieCount} connected={p.breakdown.connectCount} />
                    </td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.earnings.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.accommodation.toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted align-middle">—</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.wage.toFixed(2)}</td>
                  </tr>
                  {sectionErrors.has(p.projectId) && (
                    <tr>
                      <td />
                      <td colSpan={6} className="px-4 py-2 pl-10 text-sm text-red-600 italic">
                        {t("loadError")}
                      </td>
                    </tr>
                  )}
                  {expandedProjects.has(p.projectId) && (
                    <WorkerSectionBreakdown
                      sections={sectionCache.get(p.projectId) ?? []}
                      onToggleInvoice={(sectionId) => handleInvoiceToggle(p.projectId, sectionId)}
                      pendingSections={invoicing}
                    />
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasTotal && (
        <div className="mt-4 rounded-md border border-border-soft bg-bg p-4">
          <div className="text-xs uppercase tracking-[0.15em] font-semibold text-navy/70 mb-3">
            {tCommon("total")}
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">{t("modules")}</dt>
              <dd className="font-semibold text-navy">
                {result.total.breakdown.tieCount} / {result.total.breakdown.connectCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("earnings")}</dt>
              <dd className="font-semibold text-navy">{result.total.earnings.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("accommodation")}</dt>
              <dd className="font-semibold text-navy">{result.total.accommodation.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("invoiceable")}</dt>
              <dd className="font-semibold text-navy">{result.total.wage.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("openAdvances")}</dt>
              <dd className="font-semibold text-navy">{openAdvances.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      )}
    </>
  );
}
