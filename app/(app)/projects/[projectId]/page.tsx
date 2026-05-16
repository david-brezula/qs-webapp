import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { ProjectLogView } from "@/components/portal/ProjectLogView";
import { getTableAggregates, getMyLogs } from "@/lib/portal/activity-aggregates";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const tCommon = await getTranslations("common");

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

  const myPw = project.projectWorkers.find((pw) => pw.userId === user.id) ?? null;

  // Workers can only view projects they're assigned to
  if (user.role !== "ADMIN" && !myPw) {
    notFound();
  }

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{project.name}</h1>
          {project.location && <p className="text-sm text-muted">{project.location}</p>}
        </div>
        <div className="flex gap-2">
          {user.role === "ADMIN" && (
            <Button href={`/projects/${project.id}/edit`} variant="secondary">{tCommon("edit")}</Button>
          )}
        </div>
      </div>

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
        projectWorkerId={myPw?.id ?? null}
        isAdmin={user.role === "ADMIN"}
      />
    </div>
  );
}
