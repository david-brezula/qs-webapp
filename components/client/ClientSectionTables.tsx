"use client";

import { useTranslations } from "next-intl";
import type { ClientSection } from "@/lib/portal/client-projects";

export function ClientSectionTables({ sections }: { sections: ClientSection[] }) {
  const t = useTranslations("clientPortal");
  return (
    <div className="space-y-6">
      {sections.map((s, i) => (
        <div key={i} className="rounded-lg border border-border-soft bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-navy">{s.name}</h3>
            <span className="text-xs text-slate-ink">{s.progressPercent}%</span>
          </div>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-bg">
            <div className="h-full bg-navy" style={{ width: `${s.progressPercent}%` }} />
          </div>
          <ul className="space-y-1 text-sm">
            {s.tables.map((tb, j) => (
              <li key={j} className="flex items-center justify-between">
                <span className="text-slate-ink">{tb.name}</span>
                <span className={tb.finished ? "text-green-700" : "text-muted"}>
                  {tb.finished ? t("finished") : `${Math.min(tb.tied, tb.connected)} / ${tb.total} ${t("modules")}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
