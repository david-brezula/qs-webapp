// SECURITY: This is the ONLY data path for CLIENT-role users. The firewall is
// enforced at the APPLICATION layer (these queries run on the owner DATABASE_URL
// connection, which bypasses Postgres RLS). Therefore EVERY query here MUST scope
// by the caller's clientId (`where: { clientId }` or `where: { id, clientId }`),
// and the returned DTOs (see ./client-project-dto) must never include pricing,
// wages, advances, accommodations, worker identities, raw activity logs, or
// storageKey. If RLS is added later, treat it as defense-in-depth, not a
// replacement for these filters.
import { prisma } from "@/lib/prisma";
import { computeModules } from "./modules";
import { toPercent } from "./progress";
import { getTableAggregates } from "./activity-aggregates";
import { createSignedUrl } from "@/lib/storage";
import { assembleClientProjectDetail, type AssembleInput, type ClientProjectSummary, type ClientProjectDetail } from "./client-project-dto";

// Re-export DTO types so pages/components import everything from one place.
export type {
  ClientProjectSummary,
  ClientProjectDetail,
  ClientSection,
  ClientTable,
  ClientPhoto,
  ClientDocument,
  ClientTimelineEvent,
} from "./client-project-dto";

export async function listClientProjects(clientId: string): Promise<ClientProjectSummary[]> {
  const projects = await prisma.project.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { sections: { include: { tables: true } } },
  });
  const tableIds = projects.flatMap((p) => p.sections.flatMap((s) => s.tables.map((t) => t.id)));
  const aggregates = await getTableAggregates(tableIds);

  const maxByTable = tableIds.length
    ? await prisma.activityLog.groupBy({ by: ["tableId"], where: { tableId: { in: tableIds } }, _max: { workDate: true } })
    : [];
  const lastByTable = new Map(maxByTable.map((r) => [r.tableId, r._max.workDate ?? null]));

  return projects.map((p) => {
    let total = 0;
    let tied = 0;
    let connected = 0;
    let last: Date | null = null;
    for (const s of p.sections) {
      for (const t of s.tables) {
        total += computeModules({ rows: t.rows, cols: t.cols, skipped: t.skipped });
        const agg = aggregates.get(t.id);
        tied += agg?.totalTied ?? 0;
        connected += agg?.totalConnected ?? 0;
        const lt = lastByTable.get(t.id) ?? null;
        if (lt && (!last || lt > last)) last = lt;
      }
    }
    return {
      id: p.id,
      name: p.name,
      location: p.location,
      status: p.status,
      progressPercent: toPercent(tied + connected, total * 2),
      lastActivityAt: last ? last.toISOString() : null,
    };
  });
}

export async function getClientProject(clientId: string, projectId: string): Promise<ClientProjectDetail | null> {
  // Ownership enforced in the query: a project not owned by this client returns null.
  const project = await prisma.project.findFirst({
    where: { id: projectId, clientId },
    include: {
      sections: { orderBy: { orderIndex: "asc" }, include: { tables: { orderBy: { orderIndex: "asc" } } } },
      photos: { orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }] },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return null;

  const tableIds = project.sections.flatMap((s) => s.tables.map((t) => t.id));
  const [aggregates, logRows] = await Promise.all([
    getTableAggregates(tableIds),
    tableIds.length
      ? prisma.activityLog.findMany({
          where: { tableId: { in: tableIds } },
          select: { tableId: true, action: true, count: true, workDate: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const signedPhotos = await Promise.all(
    project.photos.map(async (ph) => ({
      id: ph.id,
      caption: ph.caption,
      takenAt: ph.takenAt,
      signedUrl: await createSignedUrl(ph.storageKey),
    })),
  );

  return assembleClientProjectDetail({
    project: {
      id: project.id,
      name: project.name,
      location: project.location,
      status: project.status,
      createdAt: project.createdAt,
      closedAt: project.closedAt,
    },
    sections: project.sections.map((s) => ({
      name: s.name,
      tables: s.tables.map((t) => ({ id: t.id, name: t.name, rows: t.rows, cols: t.cols, skipped: t.skipped })),
    })),
    aggregates,
    logRows: logRows as AssembleInput["logRows"],
    photos: signedPhotos,
    documents: project.documents.map((d) => ({ id: d.id, title: d.title, mimeType: d.mimeType, sizeBytes: d.sizeBytes })),
  });
}
