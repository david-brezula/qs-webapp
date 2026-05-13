import { describe, it, expect } from "vitest";
import { computeModules } from "./modules";

describe("computeModules", () => {
  it("returns rows * cols - skipped", () => {
    expect(computeModules({ rows: 10, cols: 20, skipped: 5 })).toBe(195);
  });

  it("treats skipped=0 normally", () => {
    expect(computeModules({ rows: 4, cols: 6, skipped: 0 })).toBe(24);
  });

  it("never returns negative — clamps to 0", () => {
    expect(computeModules({ rows: 2, cols: 2, skipped: 99 })).toBe(0);
  });

  it("rejects negative inputs by throwing", () => {
    expect(() => computeModules({ rows: -1, cols: 4, skipped: 0 })).toThrow();
    expect(() => computeModules({ rows: 4, cols: -1, skipped: 0 })).toThrow();
    expect(() => computeModules({ rows: 4, cols: 4, skipped: -1 })).toThrow();
  });

  it("rejects non-integers", () => {
    expect(() => computeModules({ rows: 1.5, cols: 4, skipped: 0 })).toThrow();
  });
});
