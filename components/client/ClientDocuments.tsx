"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ClientDocument } from "@/lib/portal/client-projects";
import { getClientDocumentUrlAction } from "@/lib/actions/client-files";

export function ClientDocuments({ documents }: { documents: ClientDocument[] }) {
  const t = useTranslations("clientPortal");
  const [pending, start] = useTransition();
  if (documents.length === 0) return <p className="text-sm text-muted">{t("noDocuments")}</p>;

  function open(id: string) {
    start(async () => {
      const r = await getClientDocumentUrlAction(id);
      if (r.ok) window.open(r.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <ul className="divide-y divide-border-soft rounded-lg border border-border-soft bg-surface">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-navy">{d.title}</span>
          <button
            onClick={() => open(d.id)}
            disabled={pending}
            className="text-sm text-navy underline disabled:opacity-50"
          >
            {t("download")}
          </button>
        </li>
      ))}
    </ul>
  );
}
