import { isTableFinished } from "./table-status";

export type SectionTimelineStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

export interface TimelineLog {
  action: "TIE" | "CONNECT";
  count: number;
  workDate: Date;
  createdAt: Date;
}
export interface TimelineTable {
  total: number; // module capacity (rows*cols - skipped)
  logs: TimelineLog[];
}
export interface TimelineSection {
  name: string;
  tables: TimelineTable[];
}
export interface TimelineProject {
  createdAt: Date;
  status: "ACTIVE" | "CLOSED";
  closedAt: Date | null;
  sections: TimelineSection[];
}

export interface SectionTimeline {
  name: string;
  status: SectionTimelineStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  lastActivityAt: Date | null;
}

export type TimelineEventType =
  | "PROJECT_STARTED"
  | "SECTION_STARTED"
  | "SECTION_COMPLETED"
  | "PROJECT_CLOSED";

export interface TimelineEvent {
  type: TimelineEventType;
  date: Date;
  sectionName?: string;
}

// A section is finished when it has at least one real (total>0) table and every
// real table is finished. Empty tables (total=0) are ignored, never block.
function sectionFinished(totals: number[], tied: number[], connected: number[]): boolean {
  let anyReal = false;
  for (let i = 0; i < totals.length; i++) {
    if (totals[i] > 0) {
      anyReal = true;
      if (!isTableFinished({ total: totals[i], tied: tied[i], connected: connected[i] })) {
        return false;
      }
    }
  }
  return anyReal;
}

export function computeSectionTimeline(section: TimelineSection): SectionTimeline {
  const all = section.tables.flatMap((t, i) => t.logs.map((l) => ({ ...l, ti: i })));
  if (all.length === 0) {
    return { name: section.name, status: "NOT_STARTED", startedAt: null, completedAt: null, lastActivityAt: null };
  }
  all.sort((a, b) => {
    const dd = a.workDate.getTime() - b.workDate.getTime();
    return dd !== 0 ? dd : a.createdAt.getTime() - b.createdAt.getTime();
  });
  const totals = section.tables.map((t) => t.total);
  const tied = section.tables.map(() => 0);
  const connected = section.tables.map(() => 0);
  let completedAt: Date | null = null;
  let lastActivityAt = all[0].workDate;
  for (const log of all) {
    if (log.action === "TIE") tied[log.ti] += log.count;
    else connected[log.ti] += log.count;
    if (log.workDate > lastActivityAt) lastActivityAt = log.workDate;
    if (completedAt === null && sectionFinished(totals, tied, connected)) {
      completedAt = log.workDate;
    }
  }
  return {
    name: section.name,
    status: completedAt ? "DONE" : "IN_PROGRESS",
    startedAt: all[0].workDate,
    completedAt,
    lastActivityAt,
  };
}

export function computeProjectTimeline(project: TimelineProject): TimelineEvent[] {
  const events: TimelineEvent[] = [{ type: "PROJECT_STARTED", date: project.createdAt }];
  for (const s of project.sections) {
    const st = computeSectionTimeline(s);
    if (st.startedAt) events.push({ type: "SECTION_STARTED", date: st.startedAt, sectionName: s.name });
    if (st.completedAt) events.push({ type: "SECTION_COMPLETED", date: st.completedAt, sectionName: s.name });
  }
  if (project.status === "CLOSED" && project.closedAt) {
    events.push({ type: "PROJECT_CLOSED", date: project.closedAt });
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}
