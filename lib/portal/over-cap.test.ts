import { describe, it, expect } from "vitest";
import { checkOverCap } from "./over-cap";

describe("checkOverCap", () => {
  it("ok when sum stays at or under cap", () => {
    expect(checkOverCap({ totalModules: 200, existing: 100, requested: 50, action: "TIE" }))
      .toEqual({ ok: true });
  });

  it("ok exactly at cap", () => {
    expect(checkOverCap({ totalModules: 200, existing: 150, requested: 50, action: "TIE" }))
      .toEqual({ ok: true });
  });

  it("rejects when sum exceeds cap and reports remaining", () => {
    const r = checkOverCap({ totalModules: 200, existing: 180, requested: 30, action: "CONNECT" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.remaining).toBe(20);
  });

  it("rejects zero or negative requested", () => {
    expect(checkOverCap({ totalModules: 200, existing: 0, requested: 0, action: "TIE" }).ok).toBe(false);
    expect(checkOverCap({ totalModules: 200, existing: 0, requested: -1, action: "TIE" }).ok).toBe(false);
  });
});
