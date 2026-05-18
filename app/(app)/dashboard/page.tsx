import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { Card } from "@/components/ui/Card";
import { ProjectLogView } from "@/components/portal/ProjectLogView";
import { computeModules } from "@/lib/portal/modules";
import { getTableAggregates, getMyLogs } from "@/lib/portal/activity-aggregates";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  const [myProjectWorkers, allActiveWorkers] = await Promise.all([
    prisma.projectWorker.findMany({
      where: { userId: user.id, project: { status: "ACTIVE" } },
      include: {
        project: {
          include: {
            sections: {
              orderBy: { orderIndex: "asc" },
              include: {
                tables: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    claims: {
                      include: { projectWorker: { include: { user: true } } },
                    },
                  },
                },
              },
            },
            projectWorkers: {
              include: { user: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: { project: { createdAt: "desc" } },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const assignedIds = new Set(myProjectWorkers.map((pw) => pw.projectId));
  const otherProjects =
    user.role === "ADMIN"
      ? await prisma.project.findMany({
          where: { status: "ACTIVE", id: { notIn: [...assignedIds] } },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const allTableIds = myProjectWorkers.flatMap((pw) =>
    pw.project.sections.flatMap((s) => s.tables.map((t) => t.id)),
  );
  const myPwIds = myProjectWorkers.map((pw) => pw.id);

  const [aggregates, myLogsMap] = await Promise.all([
    getTableAggregates(allTableIds),
    getMyLogs(allTableIds, myPwIds),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("dashboard")}</h1>

      {myProjectWorkers.length === 0 && user.role !== "ADMIN" && (
        <p className="text-sm text-muted">No active projects assigned to you.</p>
      )}

      {myProjectWorkers.map(({ id: pwId, project }) => {
        let totalModules = 0;
        let tied = 0;
        let connected = 0;
        for (const s of project.sections) {
          for (const tbl of s.tables) {
            totalModules += computeModules({
              rows: tbl.rows,
              cols: tbl.cols,
              skipped: tbl.skipped,
            });
            const agg = aggregates.get(tbl.id);
            tied += agg?.totalTied ?? 0;
            connected += agg?.totalConnected ?? 0;
          }
        }

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
          <details
            key={project.id}
            open
            className="mb-8 group rounded-lg border border-border-soft bg-surface"
          >
            <summary className="cursor-pointer list-none flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-5 border-b border-border-soft group-open:border-border-soft">
              <div>
                <h2 className="text-lg font-semibold text-navy">{project.name}</h2>
                {project.location && (
                  <p className="text-xs text-muted mt-0.5">{project.location}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-ink">
                <span>
                  <span className="font-semibold text-navy">{tied}</span>/{totalModules} tied
                </span>
                <span>
                  <span className="font-semibold text-navy">{connected}</span>/{totalModules} connected
                </span>
                {user.role === "ADMIN" && (
                  <Link
                    href={`/projects/${project.id}/edit`}
                    className="text-navy underline"
                  >
                    {tCommon("edit")}
                  </Link>
                )}
                <span className="text-muted text-lg leading-none transition-transform group-open:rotate-180">⌄</span>
              </div>
            </summary>
            <div className="p-5">
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
                projectWorkerId={pwId}
                isAdmin={user.role === "ADMIN"}
              />
            </div>
          </details>
        );
      })}

      {user.role === "ADMIN" && otherProjects.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/60 mb-4">
            Other active projects
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherProjects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card>
                  <h3 className="text-lg font-semibold text-navy">{p.name}</h3>
                  {p.location && (
                    <p className="text-sm text-muted">{p.location}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-ink">View →</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
