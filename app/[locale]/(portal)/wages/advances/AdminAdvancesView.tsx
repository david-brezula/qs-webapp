"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { decideAdvanceAction, markAdvancePaidAction } from "@/lib/actions/advances";

type Row = {
  id: string;
  workerName: string;
  amount: string;
  currency: string;
  note: string | null;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";
  requestedAt: string;
};

export function AdminAdvancesView({ requests }: { requests: Row[] }) {
  const t = useTranslations("advances");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (fd: FormData) => Promise<{ ok: boolean }>, id: string, extra?: Record<string, string>) {
    const fd = new FormData();
    fd.set("id", id);
    for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
    setError(null);
    start(async () => {
      const r = await action(fd);
      if (r.ok) router.refresh();
      else setError(tCommon("saveError"));
    });
  }

  function actionsFor(r: Row) {
    if (r.status === "REQUESTED") {
      return (
        <span className="flex gap-3">
          <button onClick={() => run(decideAdvanceAction, r.id, { decision: "approve" })} disabled={pending} className="text-navy underline">{t("approve")}</button>
          <button onClick={() => run(decideAdvanceAction, r.id, { decision: "reject" })} disabled={pending} className="text-red-600 underline">{t("reject")}</button>
        </span>
      );
    }
    if (r.status === "APPROVED") {
      return <button onClick={() => run(markAdvancePaidAction, r.id)} disabled={pending} className="text-navy underline">{t("markPaid")}</button>;
    }
    return <span className="text-muted">—</span>;
  }

  return (
    <div>
      {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}
      <DataTable
        headers={[t("worker"), t("amount"), tCommon("currency"), tCommon("status"), t("requestedAt"), t("note"), tCommon("actions")]}
        empty={t("noRequests")}
        rows={requests.map((r) => [
          r.workerName,
          r.amount,
          r.currency,
          t(`status.${r.status}`),
          r.requestedAt,
          r.note ?? "—",
          actionsFor(r),
        ])}
      />
    </div>
  );
}
