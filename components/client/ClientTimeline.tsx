"use client";

import { useTranslations } from "next-intl";
import type { ClientTimelineEvent } from "@/lib/portal/client-projects";

export function ClientTimeline({ events }: { events: ClientTimelineEvent[] }) {
  const t = useTranslations("clientPortal");
  function label(e: ClientTimelineEvent): string {
    switch (e.type) {
      case "PROJECT_STARTED": return t("evtProjectStarted");
      case "PROJECT_CLOSED": return t("evtProjectClosed");
      case "SECTION_STARTED": return t("evtSectionStarted", { section: e.sectionName ?? "" });
      case "SECTION_COMPLETED": return t("evtSectionCompleted", { section: e.sectionName ?? "" });
    }
  }
  if (events.length === 0) return <p className="text-sm text-muted">{t("noTimeline")}</p>;
  return (
    <ol className="relative border-l border-border-soft pl-6">
      {events.map((e, i) => (
        <li key={i} className="mb-6">
          <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-navy" aria-hidden />
          <time className="block text-xs text-muted">{e.date}</time>
          <p className="text-sm text-slate-ink">{label(e)}</p>
        </li>
      ))}
    </ol>
  );
}
