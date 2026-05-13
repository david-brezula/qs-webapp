import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { computeModules } from "@/lib/portal/modules";
import { TableLogger } from "./TableLogger";

export default async function LogPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const t = await getTranslations("log");
  const tProj = await getTranslations("projects");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: {
          tables: {
            orderBy: { orderIndex: "asc" },
            include: { activityLogs: { orderBy: { createdAt: "desc" } } },
          },
        },
      },
      projectWorkers: { where: { userId: user.id } },
    },
  });
  if (!project) notFound();
  if (user.role !== "ADMIN" && project.projectWorkers.length === 0) notFound();

  const projectWorkerId = project.projectWorkers[0]?.id ?? null;
  const isClosed = project.status === "CLOSED";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-1">{project.name}</h1>
      <p className="text-sm text-muted mb-8">{t("title")}</p>

      {project.sections.map((s) => (
        <section key={s.id} className="mb-8">
          <h2 className="text-lg font-semibold text-navy mb-3">{s.name}</h2>
          <div className="space-y-4">
            {s.tables.map((tbl) => {
              const total = computeModules({ rows: tbl.rows, cols: tbl.cols, skipped: tbl.skipped });
              const tied = tbl.activityLogs.filter((l) => l.action === "TIE").reduce((a, b) => a + b.count, 0);
              const connected = tbl.activityLogs.filter((l) => l.action === "CONNECT").reduce((a, b) => a + b.count, 0);

              return (
                <TableLogger
                  key={tbl.id}
                  table={{ id: tbl.id, name: tbl.name, total, tied, connected }}
                  myLogs={
                    projectWorkerId
                      ? tbl.activityLogs
                          .filter((l) => l.projectWorkerId === projectWorkerId)
                          .slice(0, 5)
                          .map((l) => ({
                            id: l.id,
                            action: l.action,
                            count: l.count,
                            workDate: l.workDate.toISOString().slice(0, 10),
                            createdAt: l.createdAt.toISOString(),
                          }))
                      : []
                  }
                  isClosed={isClosed}
                  isAdmin={user.role === "ADMIN"}
                  canSubmit={Boolean(projectWorkerId) && !isClosed}
                  labels={{
                    iTied: t("iTied"),
                    iConnected: t("iConnected"),
                    workDate: t("workDate"),
                    submit: t("submit"),
                    progress: t("tableProgress", { tied, connected, total }),
                    recent: t("recentEntries"),
                    locked: t("editWindowOver"),
                    overCap: t("overCap", { remaining: "{r}" }),
                    tied: tProj("tied"),
                    connected: tProj("connected"),
                  }}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
