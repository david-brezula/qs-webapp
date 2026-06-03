import { computeModules } from "./modules";
import { toPercent } from "./progress";
import { isTableFinished } from "./table-status";
import { computeProjectTimeline, type TimelineLog } from "./timeline";

// ---------- DTOs (the only shapes that may reach a client component) ----------
export interface ClientProjectSummary {
  id: string;
  name: string;
  location: string | null;
  status: "ACTIVE" | "CLOSED";
  progressPercent: number;
  lastActivityAt: string | null;
}
export interface ClientTable {
  name: string;
  total: number;
  tied: number;
  connected: number;
  finished: boolean;
}
export interface ClientSection {
  name: string;
  progressPercent: number;
  tables: ClientTable[];
}
export interface ClientPhoto {
  id: string;
  caption: string | null;
  takenAt: string | null;
  signedUrl: string;
}
export interface ClientDocument {
  id: string;
  title: string;
  mimeType: string | null;
  sizeBytes: number | null;
}
export interface ClientTimelineEvent {
  type: "PROJECT_STARTED" | "SECTION_STARTED" | "SECTION_COMPLETED" | "PROJECT_CLOSED";
  date: string;
  sectionName?: string;
}
export interface ClientProjectDetail {
  id: string;
  name: string;
  location: string | null;
  status: "ACTIVE" | "CLOSED";
  progressPercent: number;
  sections: ClientSection[];
  timeline: ClientTimelineEvent[];
  photos: ClientPhoto[];
  documents: ClientDocument[];
}

function isoDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export interface AssembleInput {
  project: { id: string; name: string; location: string | null; status: "ACTIVE" | "CLOSED"; createdAt: Date; closedAt: Date | null };
  sections: { name: string; tables: { id: string; name: string; rows: number; cols: number; skipped: number }[] }[];
  aggregates: Map<string, { totalTied: number; totalConnected: number }>;
  logRows: { tableId: string; action: "TIE" | "CONNECT"; count: number; workDate: Date; createdAt: Date }[];
  photos: { id: string; caption: string | null; takenAt: Date | null; signedUrl: string }[];
  documents: { id: string; title: string; mimeType: string | null; sizeBytes: number | null }[];
}

export function assembleClientProjectDetail(input: AssembleInput): ClientProjectDetail {
  const logsByTable = new Map<string, TimelineLog[]>();
  for (const r of input.logRows) {
    const arr = logsByTable.get(r.tableId) ?? [];
    arr.push({ action: r.action, count: r.count, workDate: r.workDate, createdAt: r.createdAt });
    logsByTable.set(r.tableId, arr);
  }

  let projTotal = 0;
  let projTied = 0;
  let projConnected = 0;

  const sections: ClientSection[] = input.sections.map((s) => {
    let secTotal = 0;
    let secTied = 0;
    let secConnected = 0;
    const tables: ClientTable[] = s.tables.map((t) => {
      const total = computeModules({ rows: t.rows, cols: t.cols, skipped: t.skipped });
      const agg = input.aggregates.get(t.id) ?? { totalTied: 0, totalConnected: 0 };
      secTotal += total;
      secTied += agg.totalTied;
      secConnected += agg.totalConnected;
      return {
        name: t.name,
        total,
        tied: agg.totalTied,
        connected: agg.totalConnected,
        finished: isTableFinished({ total, tied: agg.totalTied, connected: agg.totalConnected }),
      };
    });
    projTotal += secTotal;
    projTied += secTied;
    projConnected += secConnected;
    return {
      name: s.name,
      progressPercent: toPercent(secTied + secConnected, secTotal * 2),
      tables,
    };
  });

  const timeline = computeProjectTimeline({
    createdAt: input.project.createdAt,
    status: input.project.status,
    closedAt: input.project.closedAt,
    sections: input.sections.map((s) => ({
      name: s.name,
      tables: s.tables.map((t) => ({
        total: computeModules({ rows: t.rows, cols: t.cols, skipped: t.skipped }),
        logs: logsByTable.get(t.id) ?? [],
      })),
    })),
  }).map((e) => ({ type: e.type, date: isoDate(e.date)!, sectionName: e.sectionName }));

  return {
    id: input.project.id,
    name: input.project.name,
    location: input.project.location,
    status: input.project.status,
    progressPercent: toPercent(projTied + projConnected, projTotal * 2),
    sections,
    timeline,
    photos: input.photos.map((p) => ({ id: p.id, caption: p.caption, takenAt: isoDate(p.takenAt), signedUrl: p.signedUrl })),
    documents: input.documents.map((d) => ({ id: d.id, title: d.title, mimeType: d.mimeType, sizeBytes: d.sizeBytes })),
  };
}
