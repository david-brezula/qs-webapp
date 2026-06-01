"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import {
  decideAdvanceAction,
  markAdvancePaidAction,
  settleAdvanceAction,
  reopenAdvanceAction,
} from "@/lib/actions/advances";

type Status = "REQUESTED" | "APPROVED" | "REJECTED" | "PAID" | "SETTLED";

type Row = {
  id: string;
  workerName: string;
  amount: string;
  currency: string;
  note: string | null;
  status: Status;
  requestedAt: string;
  sectionName: string | null;
  settledAt: string | null;
  candidateSections: { id: string; name: string }[];
};

type Filter = "open" | "settled" | "all";

export function AdminAdvancesView({ requests }: { requests: Row[] }) {
  const t = useTranslations("advances");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");

  function run(action: (fd: FormData) => Promise<{ ok: boolean }>, fields: Record<string, string>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    setError(null);
    start(async () => {
      const r = await action(fd);
      if (r.ok) router.refresh();
      else setError(tCommon("saveError"));
    });
  }

  const shown = requests.filter((r) =>
    filter === "all" ? true : filter === "open" ? r.status === "PAID" : r.status === "SETTLED",
  );

  function actionsFor(r: Row) {
    if (r.status === "REQUESTED") {
      return (
        <span className="flex gap-3">
          <button onClick={() => run(decideAdvanceAction, { id: r.id, decision: "approve" })} disabled={pending} className="text-navy underline">{t("approve")}</button>
          <button onClick={() => run(decideAdvanceAction, { id: r.id, decision: "reject" })} disabled={pending} className="text-red-600 underline">{t("reject")}</button>
        </span>
      );
    }
    if (r.status === "APPROVED") {
      return <button onClick={() => run(markAdvancePaidAction, { id: r.id })} disabled={pending} className="text-navy underline">{t("markPaid")}</button>;
    }
    if (r.status === "PAID") {
      return <SettleControl row={r} disabled={pending} onSettle={(sectionId) => run(settleAdvanceAction, { id: r.id, sectionId })} t={t} />;
    }
    if (r.status === "SETTLED") {
      return <button onClick={() => run(reopenAdvanceAction, { id: r.id })} disabled={pending} className="text-navy underline">{t("reopen")}</button>;
    }
    return <span className="text-muted">—</span>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["open", "settled", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md border ${filter === f ? "bg-navy text-white border-navy" : "border-border-soft text-slate-ink hover:bg-bg"}`}
          >
            {t(f === "open" ? "filterOpen" : f === "settled" ? "filterSettled" : "filterAll")}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}

      <DataTable
        headers={[t("worker"), t("amount"), tCommon("currency"), tCommon("status"), t("section"), t("requestedAt"), t("note"), tCommon("actions")]}
        empty={t("noRequests")}
        rowKeys={shown.map((r) => r.id)}
        rows={shown.map((r) => [
          r.workerName,
          r.amount,
          r.currency,
          t(`status.${r.status}`),
          r.sectionName ? (r.settledAt ? `${r.sectionName} · ${r.settledAt}` : r.sectionName) : "—",
          r.requestedAt,
          r.note ?? "—",
          actionsFor(r),
        ])}
      />
    </div>
  );
}

function SettleControl({
  row,
  disabled,
  onSettle,
  t,
}: {
  row: Row;
  disabled: boolean;
  onSettle: (sectionId: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [sectionId, setSectionId] = useState("");
  return (
    <span className="flex items-center gap-2">
      <select
        value={sectionId}
        onChange={(e) => setSectionId(e.target.value)}
        className="rounded-md border border-border-soft bg-surface px-2 py-1 text-sm"
      >
        <option value="">{t("section")}…</option>
        {row.candidateSections.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button
        onClick={() => onSettle(sectionId)}
        disabled={disabled || !sectionId}
        className="text-navy underline disabled:no-underline disabled:text-muted"
      >
        {t("settle")}
      </button>
    </span>
  );
}
