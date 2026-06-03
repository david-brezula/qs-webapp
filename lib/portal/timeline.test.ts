import { describe, it, expect } from "vitest";
import { computeSectionTimeline, computeProjectTimeline } from "./timeline";

const d = (s: string) => new Date(s + "T00:00:00.000Z");

describe("computeSectionTimeline", () => {
  it("is NOT_STARTED when there are no logs", () => {
    const r = computeSectionTimeline({ name: "A", tables: [{ total: 4, logs: [] }] });
    expect(r.status).toBe("NOT_STARTED");
    expect(r.startedAt).toBeNull();
    expect(r.completedAt).toBeNull();
  });

  it("is IN_PROGRESS while below capacity", () => {
    const r = computeSectionTimeline({
      name: "A",
      tables: [{ total: 4, logs: [{ action: "TIE", count: 2, workDate: d("2026-05-01"), createdAt: d("2026-05-01") }] }],
    });
    expect(r.status).toBe("IN_PROGRESS");
    expect(r.startedAt).toEqual(d("2026-05-01"));
    expect(r.completedAt).toBeNull();
  });

  it("is DONE with completedAt at the log that crossed full tie+connect", () => {
    const r = computeSectionTimeline({
      name: "A",
      tables: [{
        total: 2,
        logs: [
          { action: "TIE", count: 2, workDate: d("2026-05-01"), createdAt: d("2026-05-01") },
          { action: "CONNECT", count: 2, workDate: d("2026-05-03"), createdAt: d("2026-05-03") },
        ],
      }],
    });
    expect(r.status).toBe("DONE");
    expect(r.completedAt).toEqual(d("2026-05-03"));
    expect(r.lastActivityAt).toEqual(d("2026-05-03"));
  });

  it("ignores empty (total=0) tables but still completes on the real one", () => {
    const r = computeSectionTimeline({
      name: "A",
      tables: [
        { total: 0, logs: [] },
        { total: 1, logs: [
          { action: "TIE", count: 1, workDate: d("2026-05-02"), createdAt: d("2026-05-02") },
          { action: "CONNECT", count: 1, workDate: d("2026-05-02"), createdAt: d("2026-05-02") },
        ] },
      ],
    });
    expect(r.status).toBe("DONE");
    expect(r.completedAt).toEqual(d("2026-05-02"));
  });
});

describe("computeProjectTimeline", () => {
  it("emits ordered events: started, section started/completed, closed", () => {
    const events = computeProjectTimeline({
      createdAt: d("2026-04-30"),
      status: "CLOSED",
      closedAt: d("2026-05-10"),
      sections: [{
        name: "Roof",
        tables: [{
          total: 1,
          logs: [
            { action: "TIE", count: 1, workDate: d("2026-05-01"), createdAt: d("2026-05-01") },
            { action: "CONNECT", count: 1, workDate: d("2026-05-04"), createdAt: d("2026-05-04") },
          ],
        }],
      }],
    });
    expect(events.map((e) => e.type)).toEqual([
      "PROJECT_STARTED",
      "SECTION_STARTED",
      "SECTION_COMPLETED",
      "PROJECT_CLOSED",
    ]);
    expect(events[1].sectionName).toBe("Roof");
  });
});
