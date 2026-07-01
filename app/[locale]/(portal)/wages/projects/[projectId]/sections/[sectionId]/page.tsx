import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { ALL_TIME_FROM, ALL_TIME_TO, computeWages, sumCapacity, sumWageRows } from "@/lib/portal/wages";
import { AdminSectionWageView } from "../../../../AdminSectionWageView";

export default async function AdminSectionWagePage({
  params,
}: {
  params: Promise<{ projectId: string; sectionId: string }>;
}) {
  await requireAdmin();
  const { projectId, sectionId } = await params;

  const [section, project, workers, prices, activity, accommodations, invoices, settledAdvances, tables] = await Promise.all([
    prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true, name: true, projectId: true },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, companyPriceTie: true, companyPriceConnect: true },
    }),
    prisma.user.findMany({ where: { active: true, role: { not: "CLIENT" } }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({ where: { projectId } }),
    prisma.activityLog.findMany({
      where: { table: { sectionId } },
      include: { projectWorker: true },
    }),
    prisma.accommodation.findMany({ where: { sectionId }, include: { workers: true } }),
    prisma.sectionInvoice.findMany({ where: { sectionId }, include: { projectWorker: true } }),
    prisma.advanceRequest.findMany({ where: { sectionId, status: "SETTLED" }, select: { userId: true, amount: true } }),
    prisma.table.findMany({ where: { sectionId }, select: { rows: true, cols: true, skipped: true } }),
  ]);

  if (!section || !project) notFound();
  if (section.projectId !== projectId) notFound();

  const result = computeWages({
    from: ALL_TIME_FROM,
    to: ALL_TIME_TO,
    projectId,
    sectionId,
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
      sectionId,
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
      projectId,
      sectionId,
    })),
  });

  const invoicedByUser = new Map(
    invoices.filter((i) => i.invoicedAt).map((i) => [i.projectWorker.userId, i.invoicedAt!.toISOString()] as const),
  );
  const paidByUser = new Set(invoices.filter((i) => i.paidAt).map((i) => i.projectWorker.userId));

  const advanceByUser = new Map<string, number>();
  for (const a of settledAdvances) {
    advanceByUser.set(a.userId, (advanceByUser.get(a.userId) ?? 0) + Number(a.amount));
  }

  const workerRows = result.rows
    .map((r) => {
      const advance = advanceByUser.get(r.userId) ?? 0;
      return {
        userId: r.userId,
        name: r.name,
        tieCount: r.breakdown.tieCount,
        connectCount: r.breakdown.connectCount,
        earnings: r.earnings,
        accommodation: r.accommodation,
        profit: r.profit,
        advance,
        // Invoiceable = earnings − accommodation − advances settled against this section.
        // (r.wage = earnings − accommodation; computeWages does not subtract advances.)
        invoiceable: r.wage - advance,
        invoicedAt: invoicedByUser.get(r.userId) ?? null,
        paid: paidByUser.has(r.userId),
        warnings: r.warnings,
      };
    })
    .filter((r) => r.earnings !== 0 || r.accommodation !== 0 || r.advance !== 0 || r.tieCount !== 0 || r.connectCount !== 0);

  // Company-side totals for the section: revenue billed, worker cost, profit,
  // and accommodation recovered from workers (what "returns" to the firm).
  const totals = sumWageRows(result.rows);
  const totalAdvance = [...advanceByUser.values()].reduce((sum, a) => sum + a, 0);

  return (
    <div>
      <Link
        href={`/wages/projects/${project.id}`}
        className="text-sm text-accent hover:underline"
      >
        ‹ {project.name}
      </Link>
      <h1 className="mt-2 mb-8 text-2xl font-semibold text-navy">{section.name}</h1>
      <AdminSectionWageView
        sectionId={section.id}
        workers={workerRows}
        capacity={sumCapacity(tables)}
        totals={{
          companyEarnings: totals.companyEarnings,
          earnings: totals.earnings,
          profit: totals.profit,
          accommodationReturned: totals.accommodation,
          invoiceable: totals.wage - totalAdvance,
        }}
      />
    </div>
  );
}
