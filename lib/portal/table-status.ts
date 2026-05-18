export interface TableProgress {
  total: number;
  tied: number;
  connected: number;
}

/**
 * A table is "finished" when it has real module capacity and both the tying
 * and connecting work have reached (or passed) that capacity. The `total > 0`
 * guard keeps an empty table from falsely reading as done.
 */
export function isTableFinished({ total, tied, connected }: TableProgress): boolean {
  return total > 0 && tied >= total && connected >= total;
}
