"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  claimTableAction,
  releaseClaimAction,
  logActivityAction,
  updateLogAction,
  deleteLogAction,
} from "@/lib/actions/activity";
import { isTableFinished } from "@/lib/portal/table-status";
import { ProgressGraph } from "@/components/portal/ProgressGraph";

type Claim = { id: string; userId: string; name: string };
type SelectableWorker = { userId: string; name: string; inProject: boolean };

const FRACTIONS = [1, 2, 3, 4, 5, 6] as const;
const fractionCount = (total: number, n: number) =>
  n === 6 ? total : Math.round((total * n) / 6);

function Counter({
  label,
  total,
  value,
  setValue,
  onSubmit,
  pending,
  open,
  onOpenChange,
}: {
  label: string;
  total: number;
  value: string;
  setValue: (s: string) => void;
  onSubmit: () => void;
  pending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted whitespace-nowrap">{label}</span>
      <div
        className="relative"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            onOpenChange(false);
          }
        }}
      >
        <input
          type="number"
          min="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => onOpenChange(true)}
          onClick={() => onOpenChange(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onOpenChange(false);
          }}
          className="w-16 rounded-md border border-border-soft bg-bg px-2 py-1 text-xs"
        />
        {open && total > 0 && (
          <div className="absolute left-0 top-full z-10 mt-1 grid grid-cols-[auto_auto_auto] gap-1 rounded-md border border-border-soft bg-[var(--color-canvas)] p-1.5 shadow-md">
            {FRACTIONS.map((n) => {
              const v = fractionCount(total, n);
              return (
                <button
                  key={n}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setValue(String(v));
                    onOpenChange(false);
                  }}
                  disabled={pending}
                  title={String(v)}
                  className="px-1.5 py-0.5 rounded border border-border-soft text-slate-ink hover:bg-bg disabled:opacity-50 leading-none"
                >
                  {n}/6
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending || !value}
        className="px-2.5 py-1 rounded-md bg-accent text-accent-ink text-xs font-semibold hover:bg-[var(--color-fjord-2)] disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}

export function TableLogger({
  table,
  myLogs,
  claims,
  myClaim,
  hasMyActivity,
  isClosed,
  isAdmin,
  isAssigned,
  sectionInvoiced,
  selectableWorkers,
  labels,
}: {
  table: { id: string; name: string; total: number; tied: number; connected: number };
  myLogs: { id: string; action: "TIE" | "CONNECT"; count: number; workDate: string; createdAt: string }[];
  claims: Claim[];
  myClaim: { id: string } | null;
  hasMyActivity: boolean;
  isClosed: boolean;
  isAdmin: boolean;
  isAssigned: boolean;
  sectionInvoiced: boolean;
  selectableWorkers: SelectableWorker[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [tieCount, setTieCount] = useState("");
  const [connectCount, setConnectCount] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [adminClaimUserId, setAdminClaimUserId] = useState("");
  const [openFraction, setOpenFraction] = useState<"TIE" | "CONNECT" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Admin "log for worker" mini-form state.
  const [adminLogUserId, setAdminLogUserId] = useState("");
  const [adminLogAction, setAdminLogAction] = useState<"TIE" | "CONNECT">("TIE");
  const [adminLogCount, setAdminLogCount] = useState("");

  const canSubmit = Boolean(myClaim) && !isClosed;
  const canClaim = !myClaim && isAssigned && !isClosed;
  // Workers may correct their own entries until they invoice the section; admins always may.
  const canEditOwn = isAdmin || !sectionInvoiced;
  const isFinished = isTableFinished({
    total: table.total,
    tied: table.tied,
    connected: table.connected,
  });

  function claim() {
    const fd = new FormData();
    fd.set("tableId", table.id);
    setError(null);
    start(async () => {
      const r = await claimTableAction(fd);
      if (!r.ok) {
        if (r.error === "not-assigned") setError(labels.notAssigned);
        else if (r.error === "closed") setError("Project is closed.");
        else setError(tCommon("save"));
        return;
      }
      router.refresh();
    });
  }

  function adminClaim() {
    if (!adminClaimUserId) return;
    const fd = new FormData();
    fd.set("tableId", table.id);
    fd.set("userId", adminClaimUserId);
    setError(null);
    start(async () => {
      const r = await claimTableAction(fd);
      if (!r.ok) {
        if (r.error === "closed") setError("Project is closed.");
        else setError(tCommon("save"));
        return;
      }
      setAdminClaimUserId("");
      router.refresh();
    });
  }

  function adminLog() {
    if (!adminLogUserId || !adminLogCount) return;
    const fd = new FormData();
    fd.set("tableId", table.id);
    fd.set("userId", adminLogUserId);
    fd.set("action", adminLogAction);
    fd.set("count", adminLogCount);
    fd.set("workDate", workDate);
    setError(null);
    start(async () => {
      const r = await logActivityAction(fd);
      if (r.ok) {
        setAdminLogCount("");
        router.refresh();
      } else if (r.error === "over-cap") {
        setError(labels.overCap.replace("{r}", String(r.remaining ?? 0)));
      } else if (r.error === "closed") {
        setError("Project is closed.");
      } else {
        setError(tCommon("save"));
      }
    });
  }

  function releaseMyClaim() {
    if (!myClaim) return;
    const fd = new FormData();
    fd.set("claimId", myClaim.id);
    setError(null);
    start(async () => {
      const r = await releaseClaimAction(fd);
      if (!r.ok) {
        if (r.error === "has-activity") setError(labels.cannotRelease);
        else setError(tCommon("save"));
        return;
      }
      router.refresh();
    });
  }

  function releaseClaim(claimId: string) {
    const fd = new FormData();
    fd.set("claimId", claimId);
    start(async () => {
      await releaseClaimAction(fd);
      router.refresh();
    });
  }

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
        setError(labels.notAssigned);
      } else if (r.error === "not-claimed") {
        setError(labels.claimToLog);
      } else if (r.error === "closed") {
        setError("Project is closed.");
      } else {
        setError(tCommon("save"));
      }
    });
  }

  function startEdit(logId: string, current: number) {
    setEditingId(logId);
    setEditValue(String(current));
    setError(null);
  }

  function saveEdit(logId: string) {
    if (!editValue) return;
    const fd = new FormData();
    fd.set("logId", logId);
    fd.set("count", editValue);
    setError(null);
    start(async () => {
      const r = await updateLogAction(fd);
      if (r.ok) {
        setEditingId(null);
        setEditValue("");
        router.refresh();
      } else if (r.error === "over-cap") {
        setError(labels.overCap.replace("{r}", String(r.remaining ?? 0)));
      } else if (r.error === "locked") {
        setError(labels.locked);
      } else {
        setError(tCommon("save"));
      }
    });
  }

  function remove(logId: string) {
    const fd = new FormData();
    fd.set("logId", logId);
    setError(null);
    start(async () => {
      const r = await deleteLogAction(fd);
      if (!r.ok && r.error === "locked") {
        setError(labels.locked);
        return;
      }
      router.refresh();
    });
  }

  const compactBtn =
    "!px-3 !py-1.5 !text-xs";
  const iconBtn =
    "!px-2.5 !py-1.5 !text-xs";

  return (
    <Card tone={isFinished ? "success" : "default"} className={`max-w-3xl p-3 ${openFraction ? "z-20" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="text-sm font-semibold text-navy">{table.name}</h3>
        {isFinished && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
            <CheckCircle2 size={12} aria-hidden="true" />
            {labels.done}
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={`table-detail-${table.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-navy"
        >
          <ChevronRight
            size={14}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          {labels.recent}
        </button>

        <div className="flex flex-wrap items-center gap-1 text-xs">
          {claims.length === 0 ? (
            <span className="text-muted italic">{labels.noClaims}</span>
          ) : (
            claims.map((c) => {
              const mine = myClaim && c.id === myClaim.id;
              const canRelease = mine ? !hasMyActivity || isAdmin : isAdmin;
              return (
                <span
                  key={c.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                    mine ? "bg-accent/15 text-navy" : "bg-bg text-slate-ink"
                  }`}
                >
                  {c.name}{mine && " (you)"}
                  {canRelease && (
                    <button
                      onClick={() => (mine ? releaseMyClaim() : releaseClaim(c.id))}
                      disabled={pending}
                      className="text-red-600 hover:underline leading-none"
                      aria-label={labels.release}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!isAssigned && !isAdmin && (
            <span className="text-xs text-muted">{labels.notAssigned}</span>
          )}
          {canClaim && (
            <Button onClick={claim} variant="primary" disabled={pending} className={compactBtn}>
              {labels.claim}
            </Button>
          )}
          {isAdmin && !isClosed && selectableWorkers.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                value={adminClaimUserId}
                onChange={(e) => setAdminClaimUserId(e.target.value)}
                disabled={pending}
                className="rounded-md border border-border-soft bg-bg px-2 py-1 text-xs max-w-[14rem]"
              >
                <option value="">+ {labels.selectWorker}</option>
                {selectableWorkers.map((w) => (
                  <option key={w.userId} value={w.userId}>
                    {w.name}{!w.inProject ? ` · ${labels.notInProject}` : ""}
                  </option>
                ))}
              </select>
              <Button
                onClick={adminClaim}
                variant="secondary"
                disabled={pending || !adminClaimUserId}
                className={iconBtn}
              >
                {labels.add}
              </Button>
            </div>
          )}
          {isClosed && <span className="text-xs text-muted">Project is closed.</span>}
        </div>
      </div>

      <div className="mt-3">
        <ProgressGraph
          variant="table"
          tied={table.tied}
          connected={table.connected}
          total={table.total}
          done={isFinished}
          labels={{
            tied: labels.progressTied,
            connected: labels.progressConnected,
          }}
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}

      {canSubmit && (
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2 text-xs">
          <Counter
            label={labels.iTied}
            total={table.total}
            value={tieCount}
            setValue={setTieCount}
            onSubmit={() => submit("TIE")}
            pending={pending}
            open={openFraction === "TIE"}
            onOpenChange={(o) => setOpenFraction(o ? "TIE" : null)}
          />
          <Counter
            label={labels.iConnected}
            total={table.total}
            value={connectCount}
            setValue={setConnectCount}
            onSubmit={() => submit("CONNECT")}
            pending={pending}
            open={openFraction === "CONNECT"}
            onOpenChange={(o) => setOpenFraction(o ? "CONNECT" : null)}
          />
          <label className="flex items-center gap-1">
            <span className="text-muted">{labels.workDate}</span>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="rounded-md border border-border-soft bg-bg px-2 py-1 text-xs"
            />
          </label>
        </div>
      )}

      {isAdmin && !isClosed && (
        <div className="mt-3 flex flex-wrap items-end gap-2 text-xs border-t border-border-soft pt-3">
          <span className="text-muted">{labels.logForWorker}</span>
          <select
            value={adminLogUserId}
            onChange={(e) => setAdminLogUserId(e.target.value)}
            disabled={pending}
            className="rounded-md border border-border-soft bg-bg px-2 py-1 text-xs max-w-[12rem]"
          >
            <option value="">{labels.selectWorker}</option>
            {claims.map((c) => (
              <option key={c.userId} value={c.userId}>{c.name}</option>
            ))}
            {selectableWorkers.map((w) => (
              <option key={w.userId} value={w.userId}>
                {w.name}{!w.inProject ? ` · ${labels.notInProject}` : ""}
              </option>
            ))}
          </select>
          <select
            value={adminLogAction}
            onChange={(e) => setAdminLogAction(e.target.value as "TIE" | "CONNECT")}
            disabled={pending}
            className="rounded-md border border-border-soft bg-bg px-2 py-1 text-xs"
          >
            <option value="TIE">{labels.tied}</option>
            <option value="CONNECT">{labels.connected}</option>
          </select>
          <input
            type="number"
            min="1"
            value={adminLogCount}
            onChange={(e) => setAdminLogCount(e.target.value)}
            placeholder="0"
            className="w-16 rounded-md border border-border-soft bg-bg px-2 py-1 text-xs"
          />
          <Button
            onClick={adminLog}
            variant="secondary"
            disabled={pending || !adminLogUserId || !adminLogCount}
            className={iconBtn}
          >
            {labels.logEntry}
          </Button>
        </div>
      )}

      {expanded && (
        <div
          id={`table-detail-${table.id}`}
          className="mt-3 pt-2 border-t border-border-soft"
        >
          {myLogs.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-navy/60 uppercase tracking-wide">{labels.recent}:</span>
              {myLogs.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1 text-slate-ink">
                  {editingId === l.id ? (
                    <>
                      <input
                        type="number"
                        min="1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-16 rounded-md border border-border-soft bg-bg px-2 py-1 text-xs"
                      />
                      {l.action === "TIE" ? labels.tied : labels.connected}
                      <button
                        onClick={() => saveEdit(l.id)}
                        disabled={pending || !editValue}
                        className="text-accent hover:underline leading-none disabled:opacity-50"
                      >
                        {tCommon("save")}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditValue(""); }}
                        disabled={pending}
                        className="text-muted hover:underline leading-none"
                      >
                        {tCommon("cancel")}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-navy">{l.count}</span>
                      {l.action === "TIE" ? labels.tied : labels.connected}
                      <span className="text-muted">· {l.workDate}</span>
                      {canEditOwn ? (
                        <>
                          <button
                            onClick={() => startEdit(l.id, l.count)}
                            disabled={pending}
                            className="text-accent hover:underline leading-none"
                            aria-label={tCommon("edit")}
                          >
                            {tCommon("edit")}
                          </button>
                          <button
                            onClick={() => remove(l.id)}
                            disabled={pending}
                            className="text-red-600 hover:underline leading-none"
                            aria-label={tCommon("delete")}
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <span className="text-muted" title={labels.locked}>🔒</span>
                      )}
                    </>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">{labels.noEntries}</p>
          )}
        </div>
      )}
    </Card>
  );
}
