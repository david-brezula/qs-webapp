import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { ALL_TIME_FROM, ALL_TIME_TO, computeWages, sumWageRows } from "@/lib/portal/wages";
import { AdminProjectWageView } from "../../AdminProjectWageView";

export default async function AdminProjectWagePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin();
  const { projectId } = await params;
  const t = await getTranslations("wages");
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = sp.from ?? today;
  const toStr = sp.to ?? today;
  const from = new Date(fromStr);
  const to = new Date(toStr);

  const [project, workers, prices, activity, accommodations] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: { orderBy: { orderIndex: "asc" }, select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({ where: { projectId } }),
    prisma.activityLog.findMany({
      where: { table: { section: { projectId } } },
      include: { projectWorker: true, table: true },
    }),
    prisma.accommodation.findMany({
      where: { projectId },
      include: { workers: true },
    }),
  ]);

  if (!project) notFound();

  const baseInput = {
    workers: workers.map((w) => ({ id: w.id, name: w.name })),
    prices: prices.map((p) => ({
      projectId: p.projectId,
      userId: p.userId,
      priceTie: Number(p.priceTie),
      priceConnect: Number(p.priceConnect),
    })),
    activity: activity.map((a) => ({
      userId: a.projectWorker.userId,
      projectId,
      sectionId: a.table.sectionId,
      action: a.action,
      count: a.count,
      workDate: a.workDate,
    })),
    accommodations: accommodations.map((acc) => ({
      id: acc.id,
      totalCost: Number(acc.totalCost),
      currency: acc.currency,
      startDate: acc.startDate,
      endDate: acc.endDate,
      workerIds: acc.workers.map((w) => w.userId),
      projectId: acc.projectId,
    })),
    projectId,
  };

  // Per-worker summary for the project (no section filter; accommodation in).
  const projectAllTime = computeWages({ ...baseInput, from: ALL_TIME_FROM, to: ALL_TIME_TO });
  const projectRanged = computeWages({ ...baseInput, from, to });

  const allTimeById = new Map(projectAllTime.rows.map((r) => [r.userId, r] as const));
  const rangedById = new Map(projectRanged.rows.map((r) => [r.userId, r] as const));
  const workerRows = workers
    .map((w) => {
      const at = allTimeById.get(w.id);
      const rg = rangedById.get(w.id);
      return {
        userId: w.id,
        name: w.name,
        allTime: {
          tie: at?.breakdown.tie ?? 0,
          connect: at?.breakdown.connect ?? 0,
          earnings: at?.earnings ?? 0,
          accommodation: at?.accommodation ?? 0,
          wage: at?.wage ?? 0,
          warnings: at?.warnings ?? [],
        },
        range: {
          tie: rg?.breakdown.tie ?? 0,
          connect: rg?.breakdown.connect ?? 0,
          earnings: rg?.earnings ?? 0,
          accommodation: rg?.accommodation ?? 0,
          wage: rg?.wage ?? 0,
        },
      };
    })
    .filter((r) => r.allTime.earnings !== 0 || r.allTime.accommodation !== 0);

  // Per-section totals (sum across all workers, no accommodation). Each
  // section runs two full scans of the activity array (all-time + range);
  // acceptable at current scale, pre-group by sectionId if sections grow.
  const sectionRows = project.sections.map((section) => {
    const at = sumWageRows(
      computeWages({ ...baseInput, sectionId: section.id, from: ALL_TIME_FROM, to: ALL_TIME_TO }).rows,
    );
    const rg = sumWageRows(
      computeWages({ ...baseInput, sectionId: section.id, from, to }).rows,
    );
    return {
      id: section.id,
      name: section.name,
      allTime: { tie: at.tie, connect: at.connect, earnings: at.earnings },
      range: { tie: rg.tie, connect: rg.connect, earnings: rg.earnings },
    };
  });

  return (
    <div>
      <Link
        href={`/wages?from=${fromStr}&to=${toStr}`}
        className="text-sm text-accent hover:underline"
      >
        ‹ {t("title")}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-navy">{project.name}</h1>
      {project.location && (
        <p className="text-sm text-muted mb-8">{project.location}</p>
      )}
      {!project.location && <div className="mb-8" />}
      <AdminProjectWageView
        projectId={project.id}
        from={fromStr}
        to={toStr}
        sections={sectionRows}
        workers={workerRows}
        mixedCurrencies={projectAllTime.mixedCurrencies}
      />
    </div>
  );
}
