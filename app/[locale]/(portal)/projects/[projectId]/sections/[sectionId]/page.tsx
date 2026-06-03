import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { ProgressGraph } from "@/components/portal/ProgressGraph";
import { SectionTables } from "@/components/portal/SectionTables";
import { computeProgress } from "@/lib/portal/progress";
import { getTableAggregates, getMyLogs } from "@/lib/portal/activity-aggregates";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ projectId: string; sectionId: string }>;
}) {
  const user = await requireUser();
  const { projectId, sectionId } = await params;

  const [project, allActiveWorkers] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: {
          where: { id: sectionId },
          include: {
            tables: {
              orderBy: { orderIndex: "asc" },
              include: {
                claims: { include: { projectWorker: { include: { user: true } } } },
              },
            },
          },
        },
        projectWorkers: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findMany({
      where: { active: true, role: { not: "CLIENT" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!project) notFound();

  const myPw = project.projectWorkers.find((pw) => pw.userId === user.id) ?? null;
  if (user.role !== "ADMIN" && !myPw) notFound();

  const section = project.sections[0];
  if (!section) notFound();

  const tableIds = section.tables.map((tbl) => tbl.id);
  const myPwIds = myPw ? [myPw.id] : [];
  const [aggregates, myLogsMap] = await Promise.all([
    getTableAggregates(tableIds),
    getMyLogs(tableIds, myPwIds),
  ]);

  const tables = section.tables.map((tbl) => {
    const agg = aggregates.get(tbl.id) ?? { totalTied: 0, totalConnected: 0 };
    const logEntry = myLogsMap.get(tbl.id) ?? { logs: [], hasActivity: false };
    return {
      ...tbl,
      totalTied: agg.totalTied,
      totalConnected: agg.totalConnected,
      myLogs: logEntry.logs,
      hasMyActivity: logEntry.hasActivity,
    };
  });

  const progress = computeProgress(tables);

  return (
    <div>
      <Link
        href={`/projects/${project.id}`}
        className="text-sm text-accent hover:underline"
      >
        ‹ {project.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-navy">{section.name}</h1>
      <div className="mt-3 mb-8 w-full max-w-[16rem]">
        <ProgressGraph
          variant="section"
          tied={progress.tied}
          connected={progress.connected}
          total={progress.total}
        />
      </div>
      {tables.length === 0 ? (
        <p className="text-sm text-muted">No tables yet.</p>
      ) : (
        <SectionTables
          tables={tables}
          assignedWorkers={project.projectWorkers.map((p) => ({
            id: p.id,
            userId: p.userId,
            name: p.user.name,
          }))}
          allActiveWorkers={allActiveWorkers}
          projectWorkerId={myPw?.id ?? null}
          isAdmin={user.role === "ADMIN"}
          isClosed={project.status === "CLOSED"}
        />
      )}
    </div>
  );
}
