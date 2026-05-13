export interface ModuleDims {
  rows: number;
  cols: number;
  skipped: number;
}

export function computeModules({ rows, cols, skipped }: ModuleDims): number {
  for (const [name, v] of [["rows", rows], ["cols", cols], ["skipped", skipped]] as const) {
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`${name} must be a non-negative integer`);
    }
  }
  return Math.max(0, rows * cols - skipped);
}
