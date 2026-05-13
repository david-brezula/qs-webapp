"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import {
  createSectionAction,
  deleteSectionAction,
  createTableAction,
  deleteTableAction,
} from "@/lib/actions/projects";

type Table = { id: string; name: string; rows: number; cols: number; skipped: number; modules: number };
type Section = { id: string; name: string; tables: Table[] };

export function SectionsEditor({
  projectId,
  sections,
  labels,
}: {
  projectId: string;
  sections: Section[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [newSectionName, setNewSectionName] = useState("");

  function addSection() {
    if (!newSectionName.trim()) return;
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("name", newSectionName.trim());
    start(async () => {
      await createSectionAction(fd);
      setNewSectionName("");
      router.refresh();
    });
  }

  function removeSection(sectionId: string) {
    const fd = new FormData();
    fd.set("sectionId", sectionId);
    fd.set("projectId", projectId);
    start(async () => {
      await deleteSectionAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-2 max-w-md">
        <input
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          placeholder={labels.section}
          className="flex-1 rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
        />
        <Button onClick={addSection} variant="primary" disabled={pending}>
          {labels.newSection}
        </Button>
      </div>

      {sections.map((s) => (
        <div key={s.id} className="rounded-md border border-border-soft bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy">{s.name}</h2>
            <button
              onClick={() => removeSection(s.id)}
              disabled={pending}
              className="text-xs text-red-600 hover:underline"
            >
              {tCommon("delete")}
            </button>
          </div>

          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-navy/60">
                <th className="py-2">{labels.table}</th>
                <th className="py-2">{labels.rows}</th>
                <th className="py-2">{labels.cols}</th>
                <th className="py-2">{labels.skipped}</th>
                <th className="py-2">{labels.modules}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {s.tables.map((t) => (
                <tr key={t.id} className="border-t border-border-soft">
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{t.rows}</td>
                  <td className="py-2">{t.cols}</td>
                  <td className="py-2">{t.skipped}</td>
                  <td className="py-2">{t.modules}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("tableId", t.id);
                        fd.set("projectId", projectId);
                        start(async () => {
                          await deleteTableAction(fd);
                          router.refresh();
                        });
                      }}
                      disabled={pending}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {tCommon("delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <NewTableRow projectId={projectId} sectionId={s.id} labels={labels} pending={pending} startTransition={start} />
        </div>
      ))}
    </div>
  );
}

function NewTableRow({
  projectId,
  sectionId,
  labels,
  pending,
  startTransition,
}: {
  projectId: string;
  sectionId: string;
  labels: Record<string, string>;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [rows, setRows] = useState("");
  const [cols, setCols] = useState("");
  const [skipped, setSkipped] = useState("0");

  function add() {
    const fd = new FormData();
    fd.set("sectionId", sectionId);
    fd.set("projectId", projectId);
    fd.set("name", name.trim());
    fd.set("rows", rows);
    fd.set("cols", cols);
    fd.set("skipped", skipped || "0");
    startTransition(async () => {
      const r = await createTableAction(fd);
      if (r.ok) {
        setName("");
        setRows("");
        setCols("");
        setSkipped("0");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid grid-cols-6 gap-2 items-center">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.table} className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm" />
      <input value={rows} onChange={(e) => setRows(e.target.value)} type="number" min="1" placeholder={labels.rows} className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm" />
      <input value={cols} onChange={(e) => setCols(e.target.value)} type="number" min="1" placeholder={labels.cols} className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm" />
      <input value={skipped} onChange={(e) => setSkipped(e.target.value)} type="number" min="0" placeholder={labels.skipped} className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm" />
      <div className="text-sm text-muted">
        = {Number(rows) > 0 && Number(cols) > 0 ? Math.max(0, Number(rows) * Number(cols) - Number(skipped || 0)) : "—"}
      </div>
      <Button onClick={add} variant="primary" disabled={pending || !name.trim() || !rows || !cols}>
        {labels.newTable}
      </Button>
    </div>
  );
}
