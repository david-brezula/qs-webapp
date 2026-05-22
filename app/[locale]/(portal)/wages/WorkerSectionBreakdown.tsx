"use client";

import { useTranslations } from "next-intl";
import type { SectionWageRow } from "@/lib/portal/wages";

export function WorkerSectionBreakdown({ sections }: { sections: SectionWageRow[] }) {
  const t = useTranslations("wages");

  if (sections.length === 0) {
    return (
      <tr>
        <td />
        <td colSpan={6} className="px-4 py-2 pl-10 text-sm text-muted italic">
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
          <td className="px-4 py-2 pl-10 text-sm text-slate-ink">{s.sectionName}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.tie.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.connect.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.earnings.toFixed(2)}</td>
          <td />
          <td />
        </tr>
      ))}
    </>
  );
}
