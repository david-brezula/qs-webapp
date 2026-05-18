"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import {
  createSectionAction,
  deleteSectionAction,
  createTableAction,
  createTablesAction,
  deleteTableAction,
  updateTableAction,
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
      <div className="flex flex-col sm:flex-row gap-2 max-w-md">
        <input
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          placeholder={labels.section}
          className="w-full sm:flex-1 rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
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
                <EditableTableRow
                  key={t.id}
                  table={t}
                  projectId={projectId}
                  pending={pending}
                  startTransition={start}
                />
              ))}
            </tbody>
          </table>

          <NewTableRow projectId={projectId} sectionId={s.id} labels={labels} pending={pending} startTransition={start} />

          <div className="mt-6 pt-4 border-t border-border-soft">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-navy/60 mb-3">
              {labels.bulkAdd}
            </div>
            <BulkTableRow projectId={projectId} sectionId={s.id} labels={labels} pending={pending} startTransition={start} />
          </div>
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

function BulkTableRow({
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
  const [count, setCount] = useState("");
  const [namePrefix, setNamePrefix] = useState("T");
  const [startNumber, setStartNumber] = useState("1");

  const countNum = Number(count);
  const valid =
    countNum >= 1 && countNum <= 100 && Number(startNumber) >= 0;

  function add() {
    if (!valid) return;
    const fd = new FormData();
    fd.set("sectionId", sectionId);
    fd.set("projectId", projectId);
    fd.set("namePrefix", namePrefix);
    fd.set("startIndex", startNumber || "1");
    fd.set("count", count);
    startTransition(async () => {
      const r = await createTablesAction(fd);
      if (r.ok) {
        setCount("");
        router.refresh();
      }
    });
  }

  const buttonLabel = labels.addQuantityTpl.replace(
    "{count}",
    count && countNum >= 1 ? String(countNum) : "N",
  );

  return (
    <div className="grid grid-cols-3 gap-2 items-center max-w-2xl">
      <input
        value={count}
        onChange={(e) => setCount(e.target.value)}
        type="number"
        min="1"
        max="100"
        placeholder={labels.quantity}
        className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm"
      />
      <div className="flex gap-1">
        <input
          value={namePrefix}
          onChange={(e) => setNamePrefix(e.target.value)}
          placeholder={labels.namePrefix}
          className="w-2/3 rounded-md border border-border-soft bg-bg px-3 py-2 text-sm"
        />
        <input
          value={startNumber}
          onChange={(e) => setStartNumber(e.target.value)}
          type="number"
          min="0"
          placeholder={labels.startNumber}
          title={labels.startNumber}
          className="w-1/3 rounded-md border border-border-soft bg-bg px-2 py-2 text-sm"
        />
      </div>
      <Button onClick={add} variant="primary" disabled={pending || !valid}>
        {buttonLabel}
      </Button>
    </div>
  );
}

function EditableTableRow({
  table,
  projectId,
  pending,
  startTransition,
}: {
  table: Table;
  projectId: string;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [rows, setRows] = useState(String(table.rows));
  const [cols, setCols] = useState(String(table.cols));
  const [skipped, setSkipped] = useState(String(table.skipped));

  const rowsNum = Number(rows) || 0;
  const colsNum = Number(cols) || 0;
  const skippedNum = Number(skipped) || 0;
  const modules = Math.max(0, rowsNum * colsNum - skippedNum);

  function persist() {
    if (
      rowsNum === table.rows &&
      colsNum === table.cols &&
      skippedNum === table.skipped
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("tableId", table.id);
    fd.set("projectId", projectId);
    fd.set("rows", String(rowsNum));
    fd.set("cols", String(colsNum));
    fd.set("skipped", String(skippedNum));
    startTransition(async () => {
      await updateTableAction(fd);
      router.refresh();
    });
  }

  function remove() {
    const fd = new FormData();
    fd.set("tableId", table.id);
    fd.set("projectId", projectId);
    startTransition(async () => {
      await deleteTableAction(fd);
      router.refresh();
    });
  }

  return (
    <tr className="border-t border-border-soft">
      <td className="py-2">{table.name}</td>
      <td className="py-2">
        <input
          value={rows}
          onChange={(e) => setRows(e.target.value)}
          onBlur={persist}
          type="number"
          min="0"
          className="w-20 rounded-md border border-border-soft bg-bg px-2 py-1 text-sm"
        />
      </td>
      <td className="py-2">
        <input
          value={cols}
          onChange={(e) => setCols(e.target.value)}
          onBlur={persist}
          type="number"
          min="0"
          className="w-20 rounded-md border border-border-soft bg-bg px-2 py-1 text-sm"
        />
      </td>
      <td className="py-2">
        <input
          value={skipped}
          onChange={(e) => setSkipped(e.target.value)}
          onBlur={persist}
          type="number"
          min="0"
          className="w-20 rounded-md border border-border-soft bg-bg px-2 py-1 text-sm"
        />
      </td>
      <td className="py-2">{modules}</td>
      <td className="py-2 text-right">
        <button
          onClick={remove}
          disabled={pending}
          className="text-xs text-red-600 hover:underline"
        >
          {tCommon("delete")}
        </button>
      </td>
    </tr>
  );
}
