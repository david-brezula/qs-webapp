import { toPercent } from "@/lib/portal/progress";

type ProgressGraphLabels = {
  heading?: string;
  tied: string;
  connected: string;
};

function ProgressBar({
  label,
  pct,
  readout,
  fillClass,
}: {
  label?: string;
  pct: number;
  readout: string;
  fillClass: string;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 text-slate-ink">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border-soft">
        <div
          className={`h-full rounded-full ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right font-semibold text-navy">
        {readout}
      </span>
    </div>
  );
}

/**
 * Renders tied / connected completion bars from raw counts.
 * - "project": headed block, two labelled bars, percentage readout.
 * - "section": two thin bars with a compact percentage readout.
 * - "table": two labelled bars with a `count / total` readout; bars render
 *   green when `done` is true.
 * Percentages are derived from the counts and clamped to 0-100.
 */
export function ProgressGraph({
  tied,
  connected,
  total,
  variant,
  done = false,
  labels,
}: {
  tied: number;
  connected: number;
  total: number;
  variant: "project" | "section" | "table";
  done?: boolean;
  labels?: ProgressGraphLabels;
}) {
  const tiedPct = toPercent(tied, total);
  const connectedPct = toPercent(connected, total);

  if (variant === "section") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-border-soft">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${tiedPct}%` }}
            />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border-soft">
            <div
              className="h-full rounded-full bg-blue-900"
              style={{ width: `${connectedPct}%` }}
            />
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold text-navy/70">
          {tiedPct}% · {connectedPct}%
        </span>
      </div>
    );
  }

  if (variant === "table") {
    const tiedFill = done ? "bg-emerald-500" : "bg-accent";
    const connectedFill = done ? "bg-emerald-500" : "bg-blue-900";
    return (
      <div className="space-y-1.5">
        <ProgressBar
          label={labels?.tied}
          pct={tiedPct}
          readout={`${tied} / ${total}`}
          fillClass={tiedFill}
        />
        <ProgressBar
          label={labels?.connected}
          pct={connectedPct}
          readout={`${connected} / ${total}`}
          fillClass={connectedFill}
        />
      </div>
    );
  }

  // variant === "project"
  return (
    <div className="mb-6 rounded-md border border-border-soft bg-surface p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/60">
        {labels?.heading}
      </p>
      <div className="space-y-2.5">
        <ProgressBar
          label={labels?.tied}
          pct={tiedPct}
          readout={`${tiedPct}%`}
          fillClass="bg-accent"
        />
        <ProgressBar
          label={labels?.connected}
          pct={connectedPct}
          readout={`${connectedPct}%`}
          fillClass="bg-blue-900"
        />
      </div>
    </div>
  );
}
