import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { computeModules } from "@/lib/portal/modules";
import { Button } from "@/components/ui/Button";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const tCommon = await getTranslations("common");
  const t = await getTranslations("projects");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: {
          tables: {
            orderBy: { orderIndex: "asc" },
            include: { activityLogs: true },
          },
        },
      },
      projectWorkers: { include: { user: true } },
    },
  });
  if (!project) notFound();

  // Workers can only view projects they're assigned to
  if (user.role !== "ADMIN" && !project.projectWorkers.find((pw) => pw.userId === user.id)) {
    notFound();
  }

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
          <Button href={`/projects/${project.id}/log`} variant="primary">Log work</Button>
        </div>
      </div>

      {project.sections.map((s) => (
        <section key={s.id} className="mb-8">
          <h2 className="text-lg font-semibold text-navy mb-3">{s.name}</h2>
          <div className="rounded-md border border-border-soft bg-surface divide-y divide-border-soft">
            {s.tables.map((tbl) => {
              const total = computeModules({ rows: tbl.rows, cols: tbl.cols, skipped: tbl.skipped });
              const tied = tbl.activityLogs.filter((l) => l.action === "TIE").reduce((a, b) => a + b.count, 0);
              const connected = tbl.activityLogs.filter((l) => l.action === "CONNECT").reduce((a, b) => a + b.count, 0);
              return (
                <div key={tbl.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-navy">{tbl.name}</div>
                    <div className="text-xs text-muted">{tbl.rows}×{tbl.cols} − {tbl.skipped} = {total} {t("modules").toLowerCase()}</div>
                  </div>
                  <div className="text-xs text-slate-ink">
                    {tied}/{total} {t("tied").toLowerCase()} · {connected}/{total} {t("connected").toLowerCase()}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
