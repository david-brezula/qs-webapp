"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { updateLogAction, deleteLogAction } from "@/lib/actions/activity";

export type WorkerLogRow = {
  id: string;
  action: "TIE" | "CONNECT";
  count: number;
  workDate: string;
  createdAt: string;
  projectId: string;
  projectName: string;
  sectionId: string;
  sectionName: string;
  tableName: string;
  /** Whether the current viewer may edit/delete this entry. Admins: always. */
  editable: boolean;
};

/**
 * Admin-only editor for a single worker's recent activity log. The server
 * actions (updateLogAction / deleteLogAction) already grant admins unrestricted
 * edit/delete and record every change to the audit trail, so this view simply
 * surfaces the entries with inline correction controls.
 */
export function WorkerActivityLog({
  logs,
  lockedLabel,
}: {
  logs: WorkerLogRow[];
  lockedLabel?: string;
}) {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");
  const tProj = useTranslations("portalProjects");
  const tLog = useTranslations("log");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function callAction(
    action: (fd: FormData) => Promise<{ ok: boolean; error?: string; remaining?: number }>,
    fd: FormData,
  ) {
    setError(null);
    const r = await action(fd);
    if (!r.ok) {
      if (r.error === "over-cap") setError(tLog("overCap", { remaining: r.remaining ?? 0 }));
      else setError(tCommon("saveError"));
      return false;
    }
    return true;
  }

  function saveEdit(id: string) {
    if (!editValue) return;
    const fd = new FormData();
    fd.set("logId", id);
    fd.set("count", editValue);
    start(async () => {
      if (await callAction(updateLogAction, fd)) {
        setEditingId(null);
        setEditValue("");
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    const fd = new FormData();
    fd.set("logId", id);
    start(async () => {
      if (await callAction(deleteLogAction, fd)) router.refresh();
    });
  }

  if (logs.length === 0) {
    return <p className="text-sm text-muted">{t("noActivity")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border-soft bg-surface">
      {error && <p className="px-4 py-2 text-xs text-red-600" role="alert">{error}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            {[tProj("section"), tProj("table"), t("action"), t("count"), t("workDate"), tCommon("actions")].map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-bg/50">
              <td className="px-4 py-2 text-slate-ink">
                <Link href={`/projects/${l.projectId}/sections/${l.sectionId}`} className="text-navy hover:underline">
                  {l.projectName} · {l.sectionName}
                </Link>
              </td>
              <td className="px-4 py-2 text-slate-ink">{l.tableName}</td>
              <td className="px-4 py-2 text-slate-ink">{l.action === "TIE" ? tProj("tied") : tProj("connected")}</td>
              <td className="px-4 py-2 text-slate-ink">
                {editingId === l.id ? (
                  <input
                    type="number"
                    min="1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-20 rounded-md border border-border-soft bg-bg px-2 py-1 text-sm"
                  />
                ) : (
                  <span className="font-semibold text-navy">{l.count}</span>
                )}
              </td>
              <td className="px-4 py-2 text-muted">{l.workDate}</td>
              <td className="px-4 py-2">
                {!l.editable ? (
                  <span className="text-muted" title={lockedLabel}>🔒</span>
                ) : editingId === l.id ? (
                  <span className="flex items-center gap-3">
                    <button onClick={() => saveEdit(l.id)} disabled={pending || !editValue} className="text-accent hover:underline disabled:opacity-50">
                      {tCommon("save")}
                    </button>
                    <button onClick={() => { setEditingId(null); setEditValue(""); }} disabled={pending} className="text-muted hover:underline">
                      {tCommon("cancel")}
                    </button>
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <button
                      onClick={() => { setEditingId(l.id); setEditValue(String(l.count)); setError(null); }}
                      disabled={pending}
                      className="text-accent hover:underline"
                    >
                      {tCommon("edit")}
                    </button>
                    <button onClick={() => remove(l.id)} disabled={pending} className="text-red-600 hover:underline">
                      {tCommon("delete")}
                    </button>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
