import { ReactNode } from "react";

export function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: ReactNode[];
  rows: ReactNode[][];
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-border-soft bg-surface p-8 text-center text-sm text-muted">
        {empty ?? "No data."}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border-soft bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-bg/50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-slate-ink align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
