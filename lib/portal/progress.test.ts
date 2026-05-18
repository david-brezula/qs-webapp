import { describe, it, expect } from "vitest";
import { computeProgress, type ProgressInput } from "./progress";

const table = (over: Partial<ProgressInput> = {}): ProgressInput => ({
  rows: 10,
  cols: 10,
  skipped: 0,
  totalTied: 0,
  totalConnected: 0,
  ...over,
});

describe("computeProgress", () => {
  it("sums total, tied and connected across tables", () => {
    const result = computeProgress([
      table({ rows: 10, cols: 10, skipped: 0, totalTied: 50, totalConnected: 20 }),
      table({ rows: 5, cols: 10, skipped: 0, totalTied: 10, totalConnected: 5 }),
    ]);
    expect(result.total).toBe(150);
    expect(result.tied).toBe(60);
    expect(result.connected).toBe(25);
  });

  it("computes percentages for a partially complete set", () => {
    const result = computeProgress([
      table({ rows: 10, cols: 10, skipped: 0, totalTied: 78, totalConnected: 54 }),
    ]);
    expect(result.tiedPct).toBe(78);
    expect(result.connectedPct).toBe(54);
  });

  it("returns all zeros for an empty array", () => {
    expect(computeProgress([])).toEqual({
      total: 0,
      tied: 0,
      connected: 0,
      tiedPct: 0,
      connectedPct: 0,
    });
  });

  it("yields 0% when total modules is zero (no divide-by-zero)", () => {
    const result = computeProgress([
      table({ rows: 0, cols: 0, skipped: 0, totalTied: 0, totalConnected: 0 }),
    ]);
    expect(result.total).toBe(0);
    expect(result.tiedPct).toBe(0);
    expect(result.connectedPct).toBe(0);
  });

  it("clamps percentages to 100 when counts exceed total (over-cap)", () => {
    const result = computeProgress([
      table({ rows: 10, cols: 10, skipped: 0, totalTied: 130, totalConnected: 100 }),
    ]);
    expect(result.tiedPct).toBe(100);
    expect(result.connectedPct).toBe(100);
  });
});
