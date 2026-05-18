import { computeModules } from "./modules";

export interface ProgressInput {
  rows: number;
  cols: number;
  skipped: number;
  totalTied: number;
  totalConnected: number;
}

export interface Progress {
  total: number;
  tied: number;
  connected: number;
  tiedPct: number;
  connectedPct: number;
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

/**
 * Aggregate completion progress across a set of tables. `total` is the summed
 * module capacity; `tied` / `connected` are the summed logged counts.
 * Percentages are clamped to 0-100 so an over-cap table cannot render a bar
 * wider than full, and a table with no capacity cannot divide by zero.
 */
export function computeProgress(tables: ProgressInput[]): Progress {
  let total = 0;
  let tied = 0;
  let connected = 0;
  for (const t of tables) {
    total += computeModules({ rows: t.rows, cols: t.cols, skipped: t.skipped });
    tied += t.totalTied;
    connected += t.totalConnected;
  }
  return {
    total,
    tied,
    connected,
    tiedPct: pct(tied, total),
    connectedPct: pct(connected, total),
  };
}
