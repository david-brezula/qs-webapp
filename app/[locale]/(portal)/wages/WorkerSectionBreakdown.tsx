"use client";

import { useTranslations } from "next-intl";
import { ModulesCell } from "@/components/portal/ModulesCell";
import type { WorkerSectionRow } from "./section-row";

export function WorkerSectionBreakdown({
  sections,
  onToggleInvoice,
  pendingSections,
}: {
  sections: WorkerSectionRow[];
  onToggleInvoice: (sectionId: string) => void;
  pendingSections: Set<string>;
}) {
  const t = useTranslations("wages");

  if (sections.length === 0) {
    return (
      <tr>
        <td />
        <td colSpan={8} className="px-4 py-2 pl-10 text-sm text-muted italic">
          {t("noData")}
        </td>
      </tr>
    );
  }
  return (
    <>
      {sections.map((s) => (
        <tr key={s.sectionId} className="bg-bg/30">
          <td />
          <td className="px-4 py-2 pl-10 text-sm text-slate-ink">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.invoiced}
                onChange={() => onToggleInvoice(s.sectionId)}
                disabled={pendingSections.has(s.sectionId)}
                title={t("invoiced")}
                aria-label={t("invoiced")}
              />
              {s.sectionName}
            </span>
          </td>
          <td className="px-4 py-2"><ModulesCell tied={s.tieCount} connected={s.connectCount} /></td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.tie.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.connect.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.earnings.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.accommodation.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.advance.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.wage.toFixed(2)}</td>
        </tr>
      ))}
    </>
  );
}
