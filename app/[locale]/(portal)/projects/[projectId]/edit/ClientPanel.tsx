"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { assignProjectToClientAction, unassignProjectAction } from "@/lib/actions/clients";

type Client = { id: string; name: string };

export function ClientPanel({
  projectId,
  current,
  clients,
  labels,
}: {
  projectId: string;
  current: Client | null;
  clients: Client[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [select, setSelect] = useState("");

  function assign() {
    if (!select) return;
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("clientId", select);
    start(async () => {
      await assignProjectToClientAction(fd);
      router.refresh();
    });
  }
  function clear() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    start(async () => {
      await unassignProjectAction(fd);
      router.refresh();
    });
  }

  if (current) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border-soft bg-surface px-4 py-3 text-sm">
        <span className="text-navy">{current.name}</span>
        <button onClick={clear} disabled={pending} className="text-xs text-red-600 hover:underline">{labels.clear}</button>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <select value={select} onChange={(e) => setSelect(e.target.value)} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm">
        <option value="">— {labels.assign} —</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <Button onClick={assign} variant="primary" disabled={pending || !select}>{labels.assign}</Button>
    </div>
  );
}
