"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { assignWorkerAction, removeAssignmentAction } from "@/lib/actions/project-workers";

export function WorkersPanel({
  projectId,
  assigned,
  available,
  labels,
}: {
  projectId: string;
  assigned: { userId: string; name: string; email: string; priceTie: number; priceConnect: number }[];
  available: { id: string; name: string; email: string }[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState("");
  const [priceTie, setPriceTie] = useState("");
  const [priceConnect, setPriceConnect] = useState("");

  function assign() {
    if (!selected) return;
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("userId", selected);
    fd.set("priceTie", priceTie || "0");
    fd.set("priceConnect", priceConnect || "0");
    start(async () => {
      await assignWorkerAction(fd);
      setSelected("");
      setPriceTie("");
      setPriceConnect("");
      router.refresh();
    });
  }

  function remove(userId: string) {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("userId", userId);
    start(async () => {
      await removeAssignmentAction(fd);
      router.refresh();
    });
  }

  function updatePrice(userId: string, priceTie: string, priceConnect: string) {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("userId", userId);
    fd.set("priceTie", priceTie);
    fd.set("priceConnect", priceConnect);
    start(async () => {
      await assignWorkerAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border-soft bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-navy/60">
              <th className="px-4 py-3">{tCommon("name")}</th>
              <th className="px-4 py-3">{labels.priceTie}</th>
              <th className="px-4 py-3">{labels.priceConnect}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {assigned.map((pw) => (
              <AssignedRow key={pw.userId} pw={pw} onChange={updatePrice} onRemove={remove} pending={pending} />
            ))}
          </tbody>
        </table>
      </div>

      {available.length > 0 && (
        <div className="grid grid-cols-4 gap-2 items-end max-w-3xl">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          >
            <option value="">— {labels.assignWorker} —</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <input
            value={priceTie}
            onChange={(e) => setPriceTie(e.target.value)}
            type="number"
            step="0.01"
            placeholder={labels.priceTie}
            className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          />
          <input
            value={priceConnect}
            onChange={(e) => setPriceConnect(e.target.value)}
            type="number"
            step="0.01"
            placeholder={labels.priceConnect}
            className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          />
          <Button onClick={assign} variant="primary" disabled={pending || !selected}>
            {labels.assignWorker}
          </Button>
        </div>
      )}
    </div>
  );
}

function AssignedRow({
  pw,
  onChange,
  onRemove,
  pending,
}: {
  pw: { userId: string; name: string; email: string; priceTie: number; priceConnect: number };
  onChange: (id: string, t: string, c: string) => void;
  onRemove: (id: string) => void;
  pending: boolean;
}) {
  const tCommon = useTranslations("common");
  const [t, setT] = useState(String(pw.priceTie));
  const [c, setC] = useState(String(pw.priceConnect));
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-semibold text-navy">{pw.name}</div>
        <div className="text-xs text-muted">{pw.email}</div>
      </td>
      <td className="px-4 py-3">
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          onBlur={() => onChange(pw.userId, t, c)}
          type="number"
          step="0.01"
          className="w-24 rounded-md border border-border-soft bg-bg px-2 py-1 text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <input
          value={c}
          onChange={(e) => setC(e.target.value)}
          onBlur={() => onChange(pw.userId, t, c)}
          type="number"
          step="0.01"
          className="w-24 rounded-md border border-border-soft bg-bg px-2 py-1 text-sm"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => onRemove(pw.userId)} disabled={pending} className="text-xs text-red-600 hover:underline">
          {tCommon("delete")}
        </button>
      </td>
    </tr>
  );
}
