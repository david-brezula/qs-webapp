"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { ModulesCell } from "@/components/portal/ModulesCell";
import { toggleSectionPaidAction } from "@/lib/actions/section-invoice";

type SectionWorkerRow = {
  userId: string;
  name: string;
  tieCount: number;
  connectCount: number;
  earnings: number;
  accommodation: number;
  profit: number;
  advance: number;
  invoiceable: number;
  paid: boolean;
  invoicedAt: string | null;
  warnings: string[];
};

type SectionTotals = {
  companyEarnings: number;
  earnings: number;
  profit: number;
  accommodationReturned: number;
  invoiceable: number;
};

function NumCell({ value }: { value: number }) {
  return <div className="font-semibold text-navy">{value.toFixed(2)}</div>;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-md border border-border-soft bg-surface px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-navy/60">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${accent ? "text-emerald-700" : "text-navy"}`}>
        {value.toFixed(2)}
      </div>
    </div>
  );
}

export function AdminSectionWageView({
  sectionId,
  workers,
  capacity,
  totals,
}: {
  sectionId: string;
  workers: SectionWorkerRow[];
  capacity: number;
  totals: SectionTotals;
}) {
  const t = useTranslations("wages");
  const tCommon = useTranslations("common");

  // Local, optimistic "paid" state so the payout panel updates in real time.
  const [paidSet, setPaidSet] = useState<Set<string>>(
    () => new Set(workers.filter((w) => w.paid).map((w) => w.userId)),
  );
  const [pending, setPending] = useState<Set<string>>(new Set());

  const hasMissingPrice = workers.some((w) => w.warnings.includes("missing-price"));
  const hasMissingCompanyPrice = workers.some((w) => w.warnings.includes("missing-company-price"));

  const { totalToPay, paidOut, remaining } = useMemo(() => {
    let total = 0;
    let paid = 0;
    for (const w of workers) {
      total += w.invoiceable;
      if (paidSet.has(w.userId)) paid += w.invoiceable;
    }
    return { totalToPay: total, paidOut: paid, remaining: total - paid };
  }, [workers, paidSet]);

  function togglePaid(userId: string) {
    if (pending.has(userId)) return;
    setPending((p) => new Set(p).add(userId));
    const flip = (s: Set<string>) => {
      const next = new Set(s);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    };
    setPaidSet(flip); // optimistic
    const fd = new FormData();
    fd.set("sectionId", sectionId);
    fd.set("userId", userId);
    void (async () => {
      try {
        const r = await toggleSectionPaidAction(fd);
        if (!r.ok) setPaidSet(flip); // revert on failure
      } catch {
        setPaidSet(flip);
      } finally {
        setPending((p) => {
          const next = new Set(p);
          next.delete(userId);
          return next;
        });
      }
    })();
  }

  return (
    <>
      <p className="text-sm text-muted mb-4">{t("capacityTotal", { count: capacity })}</p>

      {/* Firm economics */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("earnings")} value={totals.earnings} />
        <StatCard label={t("clientReturn")} value={totals.companyEarnings} accent />
        <StatCard label={t("profit")} value={totals.profit} accent />
        <StatCard label={t("accommodationReturned")} value={totals.accommodationReturned} />
      </div>

      {/* Real-time payout tracking */}
      <div className="mb-6 rounded-md border border-border-soft bg-bg p-4">
        <div className="text-xs uppercase tracking-[0.15em] font-semibold text-navy/70 mb-3">{t("payouts")}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label={t("totalToPay")} value={totalToPay} />
          <StatCard label={t("paidOut")} value={paidOut} />
          <StatCard label={t("remainingToPay")} value={remaining} accent />
        </div>
      </div>

      {hasMissingCompanyPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingCompanyPrice")}
        </p>
      )}

      {hasMissingPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      <DataTable
        headers={[tCommon("name"), t("modules"), t("earnings"), t("profit"), t("accommodation"), t("advance"), t("invoiceable"), t("paid"), t("invoiced")]}
        empty={t("noActivityYet")}
        rows={workers.map((w) => [
          w.name,
          <ModulesCell key={`mod-${w.userId}`} tied={w.tieCount} connected={w.connectCount} />,
          <NumCell key={`ear-${w.userId}`} value={w.earnings} />,
          <NumCell key={`pro-${w.userId}`} value={w.profit} />,
          <NumCell key={`acc-${w.userId}`} value={w.accommodation} />,
          <NumCell key={`adv-${w.userId}`} value={w.advance} />,
          <NumCell key={`inv-${w.userId}`} value={w.invoiceable} />,
          <label key={`paid-${w.userId}`} className="flex items-center gap-1 text-sm text-slate-ink">
            <input
              type="checkbox"
              checked={paidSet.has(w.userId)}
              onChange={() => togglePaid(w.userId)}
              disabled={pending.has(w.userId)}
              aria-label={t("paid")}
            />
            {paidSet.has(w.userId) ? t("paid") : ""}
          </label>,
          <span key={`invd-${w.userId}`} className="text-sm text-slate-ink">{w.invoicedAt ? `✓ ${w.invoicedAt.slice(0, 10)}` : "—"}</span>,
        ])}
      />
    </>
  );
}
