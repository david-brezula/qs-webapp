import { describe, it, expect } from "vitest";
import { assembleClientProjectDetail } from "./client-project-dto";

const d = (s: string) => new Date(s + "T00:00:00.000Z");

describe("assembleClientProjectDetail", () => {
  it("produces a sanitized DTO with progress, sections, timeline and media", () => {
    const dto = assembleClientProjectDetail({
      project: { id: "p1", name: "Hala", location: "Nitra", status: "ACTIVE", createdAt: d("2026-05-01"), closedAt: null },
      sections: [
        { name: "Strecha", tables: [{ id: "t1", name: "T1", rows: 2, cols: 1, skipped: 0 }] },
      ],
      aggregates: new Map([["t1", { totalTied: 2, totalConnected: 1 }]]),
      logRows: [
        { tableId: "t1", action: "TIE", count: 2, workDate: d("2026-05-02"), createdAt: d("2026-05-02") },
        { tableId: "t1", action: "CONNECT", count: 1, workDate: d("2026-05-03"), createdAt: d("2026-05-03") },
      ],
      photos: [{ id: "ph1", caption: "Pohlad", takenAt: d("2026-05-02"), signedUrl: "https://signed/ph1" }],
      documents: [{ id: "doc1", title: "Zmluva", mimeType: "application/pdf", sizeBytes: 1234 }],
    });

    expect(dto.id).toBe("p1");
    expect(dto.sections[0].tables[0]).toEqual({ name: "T1", total: 2, tied: 2, connected: 1, finished: false });
    expect(dto.sections[0].progressPercent).toBe(75); // (2+1)/(2*2) = 75%
    expect(dto.progressPercent).toBe(75);
    expect(dto.timeline[0].type).toBe("PROJECT_STARTED");
    expect(dto.photos[0]).toEqual({ id: "ph1", caption: "Pohlad", takenAt: "2026-05-02", signedUrl: "https://signed/ph1" });
    expect(dto.documents[0]).toEqual({ id: "doc1", title: "Zmluva", mimeType: "application/pdf", sizeBytes: 1234 });
    const json = JSON.stringify(dto);
    for (const banned of ["price", "wage", "storageKey", "projectWorker", "advance"]) {
      expect(json.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });
});
