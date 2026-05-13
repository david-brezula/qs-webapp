export type Action = "TIE" | "CONNECT";

export type OverCapResult =
  | { ok: true }
  | { ok: false; reason: "over-cap" | "non-positive"; remaining: number; action: Action };

export function checkOverCap(input: {
  totalModules: number;
  existing: number;
  requested: number;
  action: Action;
}): OverCapResult {
  const { totalModules, existing, requested, action } = input;
  if (requested <= 0) {
    return { ok: false, reason: "non-positive", remaining: Math.max(0, totalModules - existing), action };
  }
  if (existing + requested > totalModules) {
    return { ok: false, reason: "over-cap", remaining: Math.max(0, totalModules - existing), action };
  }
  return { ok: true };
}
