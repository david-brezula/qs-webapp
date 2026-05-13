import { describe, it, expect } from "vitest";
import { computeWages, type WageInput } from "./wages";

const baseInput: WageInput = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  workers: [
    { id: "w1", name: "Alice" },
    { id: "w2", name: "Bob" },
  ],
  prices: [
    { projectId: "p1", userId: "w1", priceTie: 1.5, priceConnect: 2.0 },
    { projectId: "p1", userId: "w2", priceTie: 1.0, priceConnect: 1.5 },
  ],
  activity: [
    { userId: "w1", projectId: "p1", action: "TIE",     count: 100, workDate: new Date("2026-05-10") },
    { userId: "w1", projectId: "p1", action: "CONNECT", count: 50,  workDate: new Date("2026-05-12") },
    { userId: "w2", projectId: "p1", action: "TIE",     count: 80,  workDate: new Date("2026-05-15") },
  ],
  accommodations: [
    {
      id: "a1",
      totalCost: 300,
      currency: "USD",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-05-31"),
      workerIds: ["w1", "w2"],
      projectId: "p1",
    },
  ],
};

describe("computeWages", () => {
  it("computes earnings = count * price per action", () => {
    const r = computeWages(baseInput);
    const alice = r.rows.find((x) => x.userId === "w1")!;
    // Alice: 100*1.5 + 50*2.0 = 150 + 100 = 250
    expect(alice.earnings).toBe(250);
  });

  it("deducts equal-share accommodation when any overlap", () => {
    const r = computeWages(baseInput);
    const alice = r.rows.find((x) => x.userId === "w1")!;
    expect(alice.accommodation).toBe(150); // 300 / 2
    expect(alice.wage).toBe(100);          // 250 - 150
  });

  it("returns warning for worker without a price on a project they logged on", () => {
    const r = computeWages({
      ...baseInput,
      prices: baseInput.prices.filter((p) => !(p.userId === "w2" && p.projectId === "p1")),
    });
    const bob = r.rows.find((x) => x.userId === "w2")!;
    expect(bob.warnings).toContain("missing-price");
  });

  it("filters out activity outside the date range", () => {
    const r = computeWages({
      ...baseInput,
      from: new Date("2026-06-01"),
      to: new Date("2026-06-30"),
    });
    expect(r.rows.every((x) => x.earnings === 0)).toBe(true);
  });

  it("includes accommodation when it overlaps even partially", () => {
    const r = computeWages({
      ...baseInput,
      from: new Date("2026-05-15"),
      to: new Date("2026-05-16"),
      activity: [],
    });
    // No activity but accommodation overlaps → wage is negative full share
    const alice = r.rows.find((x) => x.userId === "w1")!;
    expect(alice.accommodation).toBe(150);
    expect(alice.wage).toBe(-150);
  });

  it("skips accommodation when fully outside range", () => {
    const r = computeWages({
      ...baseInput,
      from: new Date("2026-06-15"),
      to: new Date("2026-06-30"),
    });
    const alice = r.rows.find((x) => x.userId === "w1")!;
    expect(alice.accommodation).toBe(0);
  });

  it("applies optional projectId filter to activity and accommodation", () => {
    const r = computeWages({
      ...baseInput,
      projectId: "p2",
    });
    expect(r.rows.every((x) => x.earnings === 0 && x.accommodation === 0)).toBe(true);
  });

  it("flags mixed currencies when accommodations span more than one currency in the range", () => {
    const r = computeWages({
      ...baseInput,
      accommodations: [
        ...baseInput.accommodations,
        {
          id: "a2",
          totalCost: 200,
          currency: "EUR",
          startDate: new Date("2026-05-10"),
          endDate: new Date("2026-05-20"),
          workerIds: ["w1"],
          projectId: "p1",
        },
      ],
    });
    expect(r.mixedCurrencies).toBe(true);
  });
});
