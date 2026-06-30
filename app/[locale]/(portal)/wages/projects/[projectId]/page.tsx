import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { ALL_TIME_FROM, ALL_TIME_TO, computeWages, sumWageRows, sumCapacity } from "@/lib/portal/wages";
import { AdminProjectWageView } from "../../AdminProjectWageView";

export default async function AdminProjectWagePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireAdmin();
  const { projectId } = await params;
  const t = await getTranslations("wages");

  const [project, workers, prices, activity, accommodations, tables] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: { orderBy: { orderIndex: "asc" }, select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({ where: { active: true, role: { not: "CLIENT" } }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({ where: { projectId } }),
    prisma.activityLog.findMany({
      where: { table: { section: { projectId } } },
      include: { projectWorker: true, table: true },
    }),
    prisma.accommodation.findMany({
      where: { projectId },
      include: { workers: true },
    }),
    prisma.table.findMany({
      where: { section: { projectId } },
      select: { rows: true, cols: true, skipped: true, sectionId: true },
    }),
  ]);

  if (!project) notFound();

  // Module capacity (rows*cols-skipped) per section and for the whole project.
  const capacityBySection = new Map<string, number>();
  for (const tbl of tables) {
    capacityBySection.set(
      tbl.sectionId,
      (capacityBySection.get(tbl.sectionId) ?? 0) + Math.max(0, tbl.rows * tbl.cols - tbl.skipped),
    );
  }
  const projectCapacity = sumCapacity(tables);

  const baseInput = {
    from: ALL_TIME_FROM,
    to: ALL_TIME_TO,
    workers: workers.map((w) => ({ id: w.id, name: w.name })),
    prices: prices.map((p) => ({
      projectId: p.projectId,
      userId: p.userId,
      priceTie: Number(p.priceTie),
      priceConnect: Number(p.priceConnect),
    })),
    companyPrices: [
      {
        projectId,
        companyPriceTie: Number(project.companyPriceTie),
        companyPriceConnect: Number(project.companyPriceConnect),
      },
    ],
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
  const projectResult = computeWages(baseInput);

  const workerRows = projectResult.rows
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      tie: r.breakdown.tie,
      connect: r.breakdown.connect,
      tieCount: r.breakdown.tieCount,
      connectCount: r.breakdown.connectCount,
      earnings: r.earnings,
      accommodation: r.accommodation,
      wage: r.wage,
      profit: r.profit,
      warnings: r.warnings,
    }))
    .filter((r) => r.earnings !== 0 || r.accommodation !== 0 || r.tieCount !== 0 || r.connectCount !== 0);

  // Whole-project company totals for the summary header.
  const projectTotals = sumWageRows(projectResult.rows);

  // Per-section totals (sum across all workers, no accommodation). Each
  // section runs one full scan of the activity array; acceptable at current
  // scale, pre-group by sectionId if sections grow.
  const sectionRows = project.sections.map((section) => {
    // accommodations: [] — section rows don't surface accommodation; this
    // matches the section page's contract and skips per-section accommodation
    // work that would otherwise be computed and discarded.
    const totals = sumWageRows(
      computeWages({ ...baseInput, sectionId: section.id, accommodations: [] }).rows,
    );
    return {
      id: section.id,
      name: section.name,
      tie: totals.tie,
      connect: totals.connect,
      tieCount: totals.tieCount,
      connectCount: totals.connectCount,
      capacity: capacityBySection.get(section.id) ?? 0,
      earnings: totals.earnings,
      companyEarnings: totals.companyEarnings,
      profit: totals.profit,
    };
  });

  return (
    <div>
      <Link href="/wages" className="text-sm text-accent hover:underline">
        ‹ {t("title")}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-navy">{project.name}</h1>
      {project.location && (
        <p className="text-sm text-muted mb-8">{project.location}</p>
      )}
      {!project.location && <div className="mb-8" />}
      <AdminProjectWageView
        projectId={project.id}
        sections={sectionRows}
        workers={workerRows}
        capacity={projectCapacity}
        mixedCurrencies={projectResult.mixedCurrencies}
        totals={{
          companyEarnings: projectTotals.companyEarnings,
          earnings: projectTotals.earnings,
          profit: projectTotals.profit,
          accommodationReturned: projectTotals.accommodation,
        }}
      />
    </div>
  );
}
