import { describe, it, expect } from "vitest";
import { isTableFinished } from "./table-status";

describe("isTableFinished", () => {
  it("is finished when tied and connected both reach total", () => {
    expect(isTableFinished({ total: 100, tied: 100, connected: 100 })).toBe(true);
  });

  it("is finished when counts exceed total (over-cap)", () => {
    expect(isTableFinished({ total: 100, tied: 120, connected: 105 })).toBe(true);
  });

  it("is not finished when tied is short", () => {
    expect(isTableFinished({ total: 100, tied: 99, connected: 100 })).toBe(false);
  });

  it("is not finished when connected is short", () => {
    expect(isTableFinished({ total: 100, tied: 100, connected: 50 })).toBe(false);
  });

  it("is not finished when total is 0 even if counts are 0", () => {
    expect(isTableFinished({ total: 0, tied: 0, connected: 0 })).toBe(false);
  });
});
