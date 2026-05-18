type ProgressGraphLabels = {
  heading: string;
  tied: string;
  connected: string;
};

function ProgressBar({
  label,
  pct,
  fillClass,
}: {
  label?: string;
  pct: number;
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
      <span className="w-9 shrink-0 text-right font-semibold text-navy">
        {pct}%
      </span>
    </div>
  );
}

/**
 * Renders tied / connected completion bars. `variant="project"` shows a
 * headed block with two labelled full-width bars; `variant="section"` shows
 * two compact stacked bars with no heading or labels. Percentages are assumed
 * already clamped to 0-100 by the caller (see computeProgress).
 */
export function ProgressGraph({
  tiedPct,
  connectedPct,
  variant,
  labels,
}: {
  tiedPct: number;
  connectedPct: number;
  variant: "project" | "section";
  labels?: ProgressGraphLabels;
}) {
  if (variant === "section") {
    return (
      <div className="flex flex-col gap-1">
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
    );
  }

  return (
    <div className="mb-6 rounded-md border border-border-soft bg-surface p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/60">
        {labels?.heading}
      </p>
      <div className="space-y-2.5">
        <ProgressBar label={labels?.tied} pct={tiedPct} fillClass="bg-accent" />
        <ProgressBar
          label={labels?.connected}
          pct={connectedPct}
          fillClass="bg-blue-900"
        />
      </div>
    </div>
  );
}
