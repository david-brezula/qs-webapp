"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  logActivityAction,
  deleteLogAction,
} from "@/lib/actions/activity";

export function TableLogger({
  table,
  myLogs,
  isClosed,
  isAdmin,
  canSubmit,
  labels,
}: {
  table: { id: string; name: string; total: number; tied: number; connected: number };
  myLogs: { id: string; action: "TIE" | "CONNECT"; count: number; workDate: string; createdAt: string }[];
  isClosed: boolean;
  isAdmin: boolean;
  canSubmit: boolean;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [tieCount, setTieCount] = useState("");
  const [connectCount, setConnectCount] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  function submit(action: "TIE" | "CONNECT") {
    const fd = new FormData();
    fd.set("tableId", table.id);
    fd.set("action", action);
    fd.set("count", action === "TIE" ? tieCount : connectCount);
    fd.set("workDate", workDate);
    setError(null);
    start(async () => {
      const r = await logActivityAction(fd);
      if (r.ok) {
        if (action === "TIE") setTieCount("");
        else setConnectCount("");
        router.refresh();
      } else if (r.error === "over-cap") {
        setError(labels.overCap.replace("{r}", String(r.remaining ?? 0)));
      } else if (r.error === "not-assigned") {
        setError("Not assigned to this project.");
      } else if (r.error === "closed") {
        setError("Project is closed.");
      } else {
        setError(tCommon("save"));
      }
    });
  }

  function remove(logId: string) {
    const fd = new FormData();
    fd.set("logId", logId);
    start(async () => {
      await deleteLogAction(fd);
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-navy">{table.name}</h3>
        <div className="text-xs text-muted">{labels.progress}</div>
      </div>

      {canSubmit && (
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] mb-3">
          <div>
            <label className="text-xs text-muted block mb-1">{labels.iTied}</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={tieCount}
                onChange={(e) => setTieCount(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-bg px-3 py-2 text-sm"
              />
              <Button onClick={() => submit("TIE")} variant="primary" disabled={pending || !tieCount}>
                +
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">{labels.iConnected}</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={connectCount}
                onChange={(e) => setConnectCount(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-bg px-3 py-2 text-sm"
              />
              <Button onClick={() => submit("CONNECT")} variant="primary" disabled={pending || !connectCount}>
                +
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">{labels.workDate}</label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {isClosed && (
        <p className="text-xs text-muted mb-2">Project is closed.</p>
      )}

      {error && <p className="text-xs text-red-600 mb-2" role="alert">{error}</p>}

      {myLogs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border-soft">
          <div className="text-xs uppercase tracking-wide text-navy/60 mb-2">{labels.recent}</div>
          <ul className="text-sm space-y-1">
            {myLogs.map((l) => {
              const ageMs = Date.now() - new Date(l.createdAt).getTime();
              const locked = !isAdmin && ageMs >= 24 * 60 * 60 * 1000;
              return (
                <li key={l.id} className="flex items-center justify-between text-slate-ink">
                  <span>
                    <span className="font-semibold text-navy">{l.count}</span>{" "}
                    {l.action === "TIE" ? labels.tied : labels.connected}{" "}
                    <span className="text-muted">· {l.workDate}</span>
                  </span>
                  {!locked && (
                    <button
                      onClick={() => remove(l.id)}
                      disabled={pending}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {tCommon("delete")}
                    </button>
                  )}
                  {locked && <span className="text-xs text-muted">{labels.locked}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
