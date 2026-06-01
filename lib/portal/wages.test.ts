import { describe, it, expect } from "vitest";
import { computeWages, computeWagesByProject, computeWagesBySection, sumWageRows, type WageInput, type WageRow } from "./wages";

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

const soloInput: WageInput & { projects: { id: string; name: string }[] } = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  workers: [{ id: "w1", name: "Alice" }],
  projects: [
    { id: "p1", name: "Alpha" },
    { id: "p2", name: "Beta" },
    { id: "p3", name: "Gamma" },
  ],
  prices: [
    { projectId: "p1", userId: "w1", priceTie: 1.5, priceConnect: 2.0 },
    { projectId: "p2", userId: "w1", priceTie: 1.0, priceConnect: 1.0 },
    { projectId: "p3", userId: "w1", priceTie: 1.0, priceConnect: 1.0 },
  ],
  activity: [
    { userId: "w1", projectId: "p1", action: "TIE", count: 100, workDate: new Date("2026-05-10") },
    { userId: "w1", projectId: "p2", action: "CONNECT", count: 40, workDate: new Date("2026-05-11") },
  ],
  accommodations: [],
};

describe("computeWagesByProject", () => {
  it("totals earnings across every project", () => {
    const r = computeWagesByProject(soloInput);
    // p1: 100*1.5 = 150 ; p2: 40*1.0 = 40
    expect(r.total.earnings).toBe(190);
  });

  it("returns one breakdown row per project with activity", () => {
    const r = computeWagesByProject(soloInput);
    expect(r.byProject.map((p) => p.projectId).sort()).toEqual(["p1", "p2"]);
    const p1 = r.byProject.find((p) => p.projectId === "p1")!;
    expect(p1.projectName).toBe("Alpha");
    expect(p1.earnings).toBe(150);
    expect(p1.breakdown.tie).toBe(150);
  });

  it("excludes projects the worker had no activity on in the range", () => {
    const r = computeWagesByProject(soloInput);
    expect(r.byProject.find((p) => p.projectId === "p3")).toBeUndefined();
  });

  it("passes through the mixed-currency flag", () => {
    const r = computeWagesByProject({
      ...soloInput,
      accommodations: [
        { id: "a1", totalCost: 100, currency: "USD", startDate: new Date("2026-05-05"), endDate: new Date("2026-05-06"), workerIds: ["w1"], projectId: "p1" },
        { id: "a2", totalCost: 100, currency: "EUR", startDate: new Date("2026-05-07"), endDate: new Date("2026-05-08"), workerIds: ["w1"], projectId: "p2" },
      ],
    });
    expect(r.mixedCurrencies).toBe(true);
  });
});

const sectionedInput: WageInput = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  workers: [{ id: "w1", name: "Alice" }],
  prices: [{ projectId: "p1", userId: "w1", priceTie: 1.0, priceConnect: 2.0 }],
  activity: [
    { userId: "w1", projectId: "p1", sectionId: "s1", action: "TIE", count: 10, workDate: new Date("2026-05-10") },
    { userId: "w1", projectId: "p1", sectionId: "s2", action: "CONNECT", count: 5, workDate: new Date("2026-05-11") },
  ],
  accommodations: [],
};

describe("computeWages sectionId filter", () => {
  it("counts only activity in the filtered section", () => {
    // s1 has only the TIE 10 entry: 10 * 1.0 = 10
    const r = computeWages({ ...sectionedInput, sectionId: "s1" });
    expect(r.rows[0].earnings).toBe(10);
    expect(r.rows[0].breakdown.tie).toBe(10);
    expect(r.rows[0].breakdown.connect).toBe(0);
  });

  it("returns zero earnings when sectionId matches no activity", () => {
    const r = computeWages({ ...sectionedInput, sectionId: "s-none" });
    expect(r.rows[0].earnings).toBe(0);
  });

  it("ignores sectionId when omitted (counts every section)", () => {
    // 10*1.0 + 5*2.0 = 20
    const r = computeWages(sectionedInput);
    expect(r.rows[0].earnings).toBe(20);
  });

  it("applies sectionId together with projectId", () => {
    const r = computeWages({ ...sectionedInput, projectId: "p1", sectionId: "s2" });
    expect(r.rows[0].earnings).toBe(10); // 5 * 2.0
    expect(r.rows[0].breakdown.connect).toBe(10);
  });
});

describe("sumWageRows", () => {
  it("sums tie / connect / earnings / accommodation / wage across rows", () => {
    const rows: WageRow[] = [
      { userId: "w1", name: "A", earnings: 10, accommodation: 2, wage: 8,
        breakdown: { tie: 6, connect: 4 }, warnings: [] },
      { userId: "w2", name: "B", earnings: 20, accommodation: 5, wage: 15,
        breakdown: { tie: 12, connect: 8 }, warnings: ["missing-price"] },
    ];
    const t = sumWageRows(rows);
    expect(t.tie).toBe(18);
    expect(t.connect).toBe(12);
    expect(t.earnings).toBe(30);
    expect(t.accommodation).toBe(7);
    expect(t.wage).toBe(23);
    expect(t.warnings).toEqual(["missing-price"]);
  });

  it("returns zeros for empty input", () => {
    expect(sumWageRows([])).toEqual({
      tie: 0, connect: 0, earnings: 0, accommodation: 0, wage: 0, warnings: [],
    });
  });

  it("deduplicates warnings across rows", () => {
    const rows: WageRow[] = [
      { userId: "w1", name: "A", earnings: 0, accommodation: 0, wage: 0,
        breakdown: { tie: 0, connect: 0 }, warnings: ["missing-price"] },
      { userId: "w2", name: "B", earnings: 0, accommodation: 0, wage: 0,
        breakdown: { tie: 0, connect: 0 }, warnings: ["missing-price"] },
    ];
    expect(sumWageRows(rows).warnings).toEqual(["missing-price"]);
  });
});

const sectionBreakdownInput: WageInput & { sections: { id: string; name: string }[] } = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  projectId: "p1",
  workers: [{ id: "w1", name: "Alice" }],
  sections: [
    { id: "s1", name: "North" },
    { id: "s2", name: "South" },
    { id: "s3", name: "East" },
  ],
  prices: [{ projectId: "p1", userId: "w1", priceTie: 1.0, priceConnect: 2.0 }],
  activity: [
    { userId: "w1", projectId: "p1", sectionId: "s1", action: "TIE",     count: 10, workDate: new Date("2026-05-10") },
    { userId: "w1", projectId: "p1", sectionId: "s2", action: "CONNECT", count: 5,  workDate: new Date("2026-05-11") },
    // s3 has no activity
  ],
  accommodations: [],
};

describe("computeWagesBySection", () => {
  it("returns one row per section that has activity", () => {
    const rows = computeWagesBySection(sectionBreakdownInput);
    expect(rows.map((r) => r.sectionId).sort()).toEqual(["s1", "s2"]);
  });

  it("omits sections with zero earnings", () => {
    const rows = computeWagesBySection(sectionBreakdownInput);
    expect(rows.find((r) => r.sectionId === "s3")).toBeUndefined();
  });

  it("computes tie earnings correctly for a section", () => {
    const rows = computeWagesBySection(sectionBreakdownInput);
    const s1 = rows.find((r) => r.sectionId === "s1")!;
    expect(s1.sectionName).toBe("North");
    expect(s1.tie).toBe(10);       // 10 * 1.0
    expect(s1.connect).toBe(0);
    expect(s1.earnings).toBe(10);
  });

  it("computes connect earnings correctly for a section", () => {
    const rows = computeWagesBySection(sectionBreakdownInput);
    const s2 = rows.find((r) => r.sectionId === "s2")!;
    expect(s2.sectionName).toBe("South");
    expect(s2.tie).toBe(0);
    expect(s2.connect).toBe(10);   // 5 * 2.0
    expect(s2.earnings).toBe(10);
  });

  it("preserves section order from input", () => {
    const rows = computeWagesBySection(sectionBreakdownInput);
    expect(rows[0].sectionId).toBe("s1");
    expect(rows[1].sectionId).toBe("s2");
  });
});

const sectionAccInput: WageInput = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  workers: [{ id: "w1", name: "Alice" }],
  prices: [{ projectId: "p1", userId: "w1", priceTie: 1.0, priceConnect: 1.0 }],
  activity: [
    { userId: "w1", projectId: "p1", sectionId: "s1", action: "TIE", count: 100, workDate: new Date("2026-05-10") },
    { userId: "w1", projectId: "p1", sectionId: "s2", action: "TIE", count: 100, workDate: new Date("2026-05-10") },
  ],
  accommodations: [
    { id: "a1", totalCost: 60, currency: "EUR", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-31"), workerIds: ["w1"], projectId: "p1", sectionId: "s1" },
  ],
};

describe("computeWages section accommodation", () => {
  it("deducts a section-assigned accommodation only in that section", () => {
    const s1 = computeWages({ ...sectionAccInput, projectId: "p1", sectionId: "s1" }).rows[0];
    expect(s1.accommodation).toBe(60);
    const s2 = computeWages({ ...sectionAccInput, projectId: "p1", sectionId: "s2" }).rows[0];
    expect(s2.accommodation).toBe(0);
  });

  it("counts a section-assigned accommodation once in the project total", () => {
    const proj = computeWages({ ...sectionAccInput, projectId: "p1" }).rows[0];
    expect(proj.accommodation).toBe(60);
  });

  it("ignores a section-assigned accommodation under a non-matching section filter", () => {
    const none = computeWages({ ...sectionAccInput, projectId: "p1", sectionId: "s3" }).rows[0];
    expect(none.accommodation).toBe(0);
  });
});

const sectionBreakdownAccInput: WageInput & { sections: { id: string; name: string }[] } = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  projectId: "p1",
  workers: [{ id: "w1", name: "Alice" }],
  sections: [{ id: "s1", name: "North" }, { id: "s2", name: "South" }],
  prices: [{ projectId: "p1", userId: "w1", priceTie: 1.0, priceConnect: 1.0 }],
  activity: [
    { userId: "w1", projectId: "p1", sectionId: "s1", action: "TIE", count: 100, workDate: new Date("2026-05-10") },
  ],
  accommodations: [
    { id: "a1", totalCost: 40, currency: "EUR", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-31"), workerIds: ["w1"], projectId: "p1", sectionId: "s1" },
    { id: "a2", totalCost: 25, currency: "EUR", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-31"), workerIds: ["w1"], projectId: "p1", sectionId: "s2" },
  ],
};

describe("computeWagesBySection accommodation", () => {
  it("attributes accommodation and net to the section with earnings", () => {
    const rows = computeWagesBySection(sectionBreakdownAccInput);
    const s1 = rows.find((r) => r.sectionId === "s1")!;
    expect(s1.earnings).toBe(100);
    expect(s1.accommodation).toBe(40);
    expect(s1.wage).toBe(60);
  });

  it("includes a section that has only an accommodation deduction (zero earnings)", () => {
    const rows = computeWagesBySection(sectionBreakdownAccInput);
    const s2 = rows.find((r) => r.sectionId === "s2")!;
    expect(s2).toBeDefined();
    expect(s2.earnings).toBe(0);
    expect(s2.accommodation).toBe(25);
    expect(s2.wage).toBe(-25);
  });
});
