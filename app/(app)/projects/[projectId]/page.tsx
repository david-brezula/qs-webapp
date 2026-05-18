import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { ProgressGraph } from "@/components/portal/ProgressGraph";
import { SectionList } from "@/components/portal/SectionList";
import { computeProgress } from "@/lib/portal/progress";
import { getTableAggregates } from "@/lib/portal/activity-aggregates";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const t = await getTranslations("log");
  const tCommon = await getTranslations("common");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: { tables: { orderBy: { orderIndex: "asc" } } },
      },
      projectWorkers: { select: { userId: true } },
    },
  });
  if (!project) notFound();

  // Workers can only view projects they're assigned to
  const isAssigned = project.projectWorkers.some((pw) => pw.userId === user.id);
  if (user.role !== "ADMIN" && !isAssigned) {
    notFound();
  }

  const tableIds = project.sections.flatMap((s) => s.tables.map((tbl) => tbl.id));
  const aggregates = await getTableAggregates(tableIds);

  const toProgressInput = (tbl: {
    rows: number;
    cols: number;
    skipped: number;
    id: string;
  }) => {
    const agg = aggregates.get(tbl.id) ?? { totalTied: 0, totalConnected: 0 };
    return {
      rows: tbl.rows,
      cols: tbl.cols,
      skipped: tbl.skipped,
      totalTied: agg.totalTied,
      totalConnected: agg.totalConnected,
    };
  };

  const sections = project.sections.map((s) => {
    const p = computeProgress(s.tables.map(toProgressInput));
    return { id: s.id, name: s.name, tied: p.tied, connected: p.connected, total: p.total };
  });

  const projectProgress = {
    tied: sections.reduce((sum, s) => sum + s.tied, 0),
    connected: sections.reduce((sum, s) => sum + s.connected, 0),
    total: sections.reduce((sum, s) => sum + s.total, 0),
  };

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

      <ProgressGraph
        variant="project"
        tied={projectProgress.tied}
        connected={projectProgress.connected}
        total={projectProgress.total}
        labels={{
          heading: t("progressHeading"),
          tied: t("progressTied"),
          connected: t("progressConnected"),
        }}
      />

      {sections.length === 0 ? (
        <p className="text-sm text-muted">No sections yet.</p>
      ) : (
        <SectionList projectId={project.id} sections={sections} />
      )}
    </div>
  );
}
