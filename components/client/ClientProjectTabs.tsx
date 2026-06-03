"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ClientProjectDetail } from "@/lib/portal/client-projects";
import { ClientSectionTables } from "./ClientSectionTables";
import { ClientTimeline } from "./ClientTimeline";
import { ClientGallery } from "./ClientGallery";
import { ClientDocuments } from "./ClientDocuments";

type Tab = "progress" | "timeline" | "gallery" | "documents";

export function ClientProjectTabs({ project }: { project: ClientProjectDetail }) {
  const t = useTranslations("clientPortal");
  const [tab, setTab] = useState<Tab>("progress");
  const tabs: { id: Tab; label: string }[] = [
    { id: "progress", label: t("tabProgress") },
    { id: "timeline", label: t("tabTimeline") },
    { id: "gallery", label: t("tabGallery") },
    { id: "documents", label: t("tabDocuments") },
  ];
  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-border-soft">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-4 py-2 text-sm ${tab === tb.id ? "border-b-2 border-navy font-medium text-navy" : "text-slate-ink hover:text-navy"}`}
          >
            {tb.label}
          </button>
        ))}
      </div>
      {tab === "progress" && <ClientSectionTables sections={project.sections} />}
      {tab === "timeline" && <ClientTimeline events={project.timeline} />}
      {tab === "gallery" && <ClientGallery photos={project.photos} />}
      {tab === "documents" && <ClientDocuments documents={project.documents} />}
    </div>
  );
}
