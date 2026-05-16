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

  const map = new Map<string, { logs: typeof logs; hasActivity: boolean }>();
  for (const tableId of tableIds) {
    const tableLogs = logs.filter((l) => l.tableId === tableId).slice(0, 5);
    map.set(tableId, { logs: tableLogs, hasActivity: tableLogs.length > 0 });
  }
  return map;
}
