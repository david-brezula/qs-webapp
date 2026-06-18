import { prisma } from "@/lib/prisma";

export type TableAggregate = {
  totalTied: number;
  totalConnected: number;
};

export async function getTableAggregates(
  tableIds: string[],
): Promise<Map<string, TableAggregate>> {
  if (tableIds.length === 0) return new Map();

  const rows = await prisma.activityLog.groupBy({
    by: ["tableId", "action"],
    where: { tableId: { in: tableIds } },
    _sum: { count: true },
  });

  const map = new Map<string, TableAggregate>();
  for (const row of rows) {
    if (!map.has(row.tableId)) map.set(row.tableId, { totalTied: 0, totalConnected: 0 });
    const entry = map.get(row.tableId)!;
    if (row.action === "TIE") entry.totalTied = row._sum.count ?? 0;
    else entry.totalConnected = row._sum.count ?? 0;
  }
  return map;
}

export async function getMyLogs(
  tableIds: string[],
  projectWorkerIds: string[],
): Promise<Map<string, { logs: Array<{ id: string; projectWorkerId: string; action: "TIE" | "CONNECT"; count: number; workDate: Date; createdAt: Date }>; hasActivity: boolean }>> {
  if (tableIds.length === 0 || projectWorkerIds.length === 0) return new Map();

  const logs = await prisma.activityLog.findMany({
    where: {
      tableId: { in: tableIds },
      projectWorkerId: { in: projectWorkerIds },
    },
    orderBy: { createdAt: "desc" },
    take: tableIds.length * 10,
  });

  // Tables with rows in the fetched batch
  const coveredTableIds = new Set(logs.map((l) => l.tableId));

  // For tables NOT covered by the take limit, check existence separately
  const uncoveredTableIds = tableIds.filter((id) => !coveredTableIds.has(id));
  let extraActivitySet = new Set<string>();
  if (uncoveredTableIds.length > 0) {
    const extras = await prisma.activityLog.findMany({
      where: {
        tableId: { in: uncoveredTableIds },
        projectWorkerId: { in: projectWorkerIds },
      },
      select: { tableId: true },
      distinct: ["tableId"],
    });
    extraActivitySet = new Set(extras.map((r) => r.tableId));
  }

  const map = new Map<string, { logs: typeof logs; hasActivity: boolean }>();
  for (const tableId of tableIds) {
    const tableLogs = logs.filter((l) => l.tableId === tableId).slice(0, 5);
    const hasActivity = tableLogs.length > 0 || extraActivitySet.has(tableId);
    map.set(tableId, { logs: tableLogs, hasActivity });
  }
  return map;
}

export type AdminTableLog = {
  id: string;
  projectWorkerId: string;
  userId: string;
  workerName: string;
  action: "TIE" | "CONNECT";
  count: number;
  workDate: Date;
  createdAt: Date;
};

/**
 * Recent ActivityLog rows for the given tables across ALL workers (newest
 * first), each tagged with the worker's name. Admin-only: lets a table card
 * surface — and inline-edit — entries every worker made, not just the viewer's
 * own. For the full history of one worker use the worker detail page, which
 * loads more rows.
 */
export async function getRecentTableLogs(
  tableIds: string[],
  perTable = 8,
): Promise<Map<string, AdminTableLog[]>> {
  const map = new Map<string, AdminTableLog[]>();
  if (tableIds.length === 0) return map;
  for (const tableId of tableIds) map.set(tableId, []);

  // Generous global take so an active table doesn't starve quieter ones before
  // each table's per-table cap is reached.
  const logs = await prisma.activityLog.findMany({
    where: { tableId: { in: tableIds } },
    orderBy: { createdAt: "desc" },
    take: tableIds.length * perTable * 4,
    include: {
      projectWorker: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  for (const l of logs) {
    const bucket = map.get(l.tableId);
    if (!bucket || bucket.length >= perTable) continue;
    bucket.push({
      id: l.id,
      projectWorkerId: l.projectWorkerId,
      userId: l.projectWorker.userId,
      workerName: l.projectWorker.user.name,
      action: l.action,
      count: l.count,
      workDate: l.workDate,
      createdAt: l.createdAt,
    });
  }
  return map;
}
