"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  updateClientAction,
  assignProjectToClientAction,
  unassignProjectAction,
  resetClientPasswordAction,
} from "@/lib/actions/clients";

type Project = { id: string; name: string };

export function EditClientForm({
  client,
  assigned,
  available,
  labels,
}: {
  client: { id: string; name: string; company: string | null; email: string | null; active: boolean };
  assigned: Project[];
  available: Project[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [temp, setTemp] = useState<string | null>(null);
  const [select, setSelect] = useState("");

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("clientId", client.id);
    start(async () => {
      await updateClientAction(fd);
      router.refresh();
    });
  }

  function assign() {
    if (!select) return;
    const fd = new FormData();
    fd.set("clientId", client.id);
    fd.set("projectId", select);
    start(async () => {
      await assignProjectToClientAction(fd);
      setSelect("");
      router.refresh();
    });
  }

  function unassign(projectId: string) {
    const fd = new FormData();
    fd.set("projectId", projectId);
    start(async () => {
      await unassignProjectAction(fd);
      router.refresh();
    });
  }

  function reset() {
    const fd = new FormData();
    fd.set("clientId", client.id);
    start(async () => {
      const r = await resetClientPasswordAction(fd);
      if (r.ok && r.data) setTemp(r.data.tempPassword);
    });
  }

  return (
    <div className="space-y-10">
      <form onSubmit={save} className="space-y-4">
        <label className="block text-sm">
          <span className="text-slate-ink">{labels.name}</span>
          <input name="name" defaultValue={client.name} className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-ink">{labels.company}</span>
          <input name="company" defaultValue={client.company ?? ""} className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-ink">{labels.email}</span>
          <input name="email" type="email" defaultValue={client.email ?? ""} className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="active" type="checkbox" defaultChecked={client.active} />
          <span className="text-slate-ink">{labels.active}</span>
        </label>
        <Button type="submit" variant="primary" disabled={pending}>{labels.save}</Button>
      </form>

      <div className="space-y-2">
        <Button onClick={reset} variant="secondary" disabled={pending}>{labels.resetPassword}</Button>
        {temp && (
          <p className="text-sm">
            {labels.tempPassword}: <code className="rounded bg-bg px-2 py-1 font-mono text-xs">{temp}</code>
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy">{labels.projects}</h2>
        <ul className="mb-3 divide-y divide-border-soft rounded-md border border-border-soft bg-surface">
          {assigned.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-navy">{p.name}</span>
              <button onClick={() => unassign(p.id)} disabled={pending} className="text-xs text-red-600 hover:underline">
                {labels.unassign}
              </button>
            </li>
          ))}
        </ul>
        {available.length > 0 && (
          <div className="flex items-end gap-2">
            <select value={select} onChange={(e) => setSelect(e.target.value)} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm">
              <option value="">— {labels.assign} —</option>
              {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Button onClick={assign} variant="primary" disabled={pending || !select}>{labels.assign}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
