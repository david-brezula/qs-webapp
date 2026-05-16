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
