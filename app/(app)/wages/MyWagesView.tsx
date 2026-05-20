"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SectionWageRow, WageByProjectResult } from "@/lib/portal/wages";
import { WorkerSectionBreakdown } from "./WorkerSectionBreakdown";

export function MyWagesView({
  from,
  to,
  result,
}: {
  from: string;
  to: string;
  result: WageByProjectResult;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations("wages");
  const tCommon = useTranslations("common");
  const [f, setF] = useState(from);
  const [tt, setTt] = useState(to);

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [sectionCache, setSectionCache] = useState<Map<string, SectionWageRow[]>>(new Map());
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());

  // When the server returns a new result (date range changed), discard cached sections.
  useEffect(() => {
    setExpandedProjects(new Set());
    setSectionCache(new Map());
    setLoadingSections(new Set());
  }, [from, to]);

  function apply() {
    const params = new URLSearchParams(sp);
    params.set("from", f);
    params.set("to", tt);
    router.push(`/wages?${params.toString()}`);
  }

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
    setLoadingSections((prev) => new Set(prev).add(projectId));
    try {
      const qs = new URLSearchParams({ from, to });
      const res = await fetch(`/api/wages/projects/${projectId}/sections?${qs}`);
      if (!res.ok) throw new Error(`sections fetch failed: ${res.status}`);
      const data: { sections: SectionWageRow[] } = await res.json();
      setSectionCache((prev) => new Map(prev).set(projectId, data.sections));
      setExpandedProjects((prev) => new Set(prev).add(projectId));
    } finally {
      setLoadingSections((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  }

  const hasTotal = result.total.earnings !== 0 || result.total.accommodation !== 0;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end mb-6">
        <div className="w-full sm:w-auto">
          <label htmlFor="my-wages-from" className="text-xs text-muted block mb-1">{t("from")}</label>
          <input
            id="my-wages-from"
            type="date"
            value={f}
            onChange={(e) => setF(e.target.value)}
            className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="my-wages-to" className="text-xs text-muted block mb-1">{t("to")}</label>
          <input
            id="my-wages-to"
            type="date"
            value={tt}
            onChange={(e) => setTt(e.target.value)}
            className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          />
        </div>
        <Button onClick={apply} variant="primary" className="w-full sm:w-auto">{t("calculate")}</Button>
      </div>

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
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("tie")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("connect")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("earnings")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("accommodation")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("wage")}</th>
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
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.breakdown.tie.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.breakdown.connect.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.earnings.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.accommodation.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.wage.toFixed(2)}</td>
                  </tr>
                  {expandedProjects.has(p.projectId) && (
                    <WorkerSectionBreakdown sections={sectionCache.get(p.projectId) ?? []} />
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
              <dt className="text-xs text-muted">{t("tie")}</dt>
              <dd className="font-semibold text-navy">{result.total.breakdown.tie.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("connect")}</dt>
              <dd className="font-semibold text-navy">{result.total.breakdown.connect.toFixed(2)}</dd>
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
              <dt className="text-xs text-muted">{t("wage")}</dt>
              <dd className="font-semibold text-navy">{result.total.wage.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      )}
    </>
  );
}
