import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { ProjectLogView } from "@/components/portal/ProjectLogView";
import { getTableAggregates, getMyLogs } from "@/lib/portal/activity-aggregates";

export default async function LogPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const t = await getTranslations("log");

  const [project, allActiveWorkers] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: {
          orderBy: { orderIndex: "asc" },
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
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!project) notFound();
  const myPw = project.projectWorkers.find((p) => p.userId === user.id) ?? null;
  if (user.role !== "ADMIN" && !myPw) notFound();

  const projectWorkerId = myPw?.id ?? null;

  const tableIds = project.sections.flatMap((s) => s.tables.map((t) => t.id));
  const myPwIds = myPw ? [myPw.id] : [];

  const [aggregates, myLogsMap] = await Promise.all([
    getTableAggregates(tableIds),
    getMyLogs(tableIds, myPwIds),
  ]);

  const sections = project.sections.map((s) => ({
    ...s,
    tables: s.tables.map((tbl) => {
      const agg = aggregates.get(tbl.id) ?? { totalTied: 0, totalConnected: 0 };
      const logEntry = myLogsMap.get(tbl.id) ?? { logs: [], hasActivity: false };
      return {
        ...tbl,
        totalTied: agg.totalTied,
        totalConnected: agg.totalConnected,
        myLogs: logEntry.logs,
        hasMyActivity: logEntry.hasActivity,
      };
    }),
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-1">{project.name}</h1>
      <p className="text-sm text-muted mb-8">{t("title")}</p>

      <ProjectLogView
        project={{
          id: project.id,
          name: project.name,
          location: project.location,
          status: project.status,
          sections,
        }}
        assignedWorkers={project.projectWorkers.map((p) => ({
          id: p.id,
          userId: p.userId,
          name: p.user.name,
        }))}
        allActiveWorkers={allActiveWorkers}
        projectWorkerId={projectWorkerId}
        isAdmin={user.role === "ADMIN"}
        showProgress
      />
    </div>
  );
}
