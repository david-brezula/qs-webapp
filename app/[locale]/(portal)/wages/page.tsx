import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  ALL_TIME_FROM,
  ALL_TIME_TO,
  computeWages,
  computeWagesByProject,
  sumWageRows,
  sumOpenAdvances,
} from "@/lib/portal/wages";
import { withWorkerScope } from "@/lib/prisma-worker";
import { MyWagesView } from "./MyWagesView";
import { AdminProjectList } from "./AdminProjectList";

export default async function WagesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; projectId?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const t = await getTranslations("wages");
  const tNav = await getTranslations("nav");

  // Worker: only their own wages, read through the RLS-enforced connection.
  if (user.role !== "ADMIN") {
    const today = new Date().toISOString().slice(0, 10);
    const fromStr = sp.from ?? today;
    const toStr = sp.to ?? today;
    const from = new Date(fromStr);
    const to = new Date(toStr);

    const data = await withWorkerScope(user.id, async (tx) => {
      const [prices, activity, accommodations, projects, advances] = await Promise.all([
        tx.projectWorker.findMany(),
        tx.activityLog.findMany({
          where: { workDate: { gte: from, lte: to } },
          include: { projectWorker: true, table: { include: { section: true } } },
        }),
        tx.accommodation.findMany({
          where: { startDate: { lte: to }, endDate: { gte: from } },
          include: { workers: true },
        }),
        tx.project.findMany({ orderBy: { createdAt: "desc" } }),
        tx.advanceRequest.findMany({ where: { status: "PAID" }, select: { amount: true, status: true } }),
      ]);
      return { prices, activity, accommodations, projects, advances };
    });

    const result = computeWagesByProject({
      from,
      to,
      projectId: null,
      workers: [{ id: user.id, name: user.name ?? "" }],
      projects: data.projects.map((p) => ({ id: p.id, name: p.name })),
      prices: data.prices.map((p) => ({
        projectId: p.projectId,
        userId: p.userId,
        priceTie: Number(p.priceTie),
        priceConnect: Number(p.priceConnect),
      })),
      activity: data.activity.map((a) => ({
        userId: a.projectWorker.userId,
        projectId: a.table.section.projectId,
        action: a.action,
        count: a.count,
        workDate: a.workDate,
      })),
      accommodations: data.accommodations.map((acc) => ({
        id: acc.id,
        totalCost: Number(acc.totalCost),
        currency: acc.currency,
        startDate: acc.startDate,
        endDate: acc.endDate,
        workerIds: acc.workers.map((w) => w.userId),
        projectId: acc.projectId,
      })),
    });

    const openAdvances = sumOpenAdvances(
      data.advances.map((a) => ({ amount: Number(a.amount), status: a.status })),
    );

    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-navy">{t("title")}</h1>
          <Link href="/wages/advances" className="text-sm text-accent hover:underline">{tNav("advances")} →</Link>
        </div>
        <MyWagesView key={`${fromStr}-${toStr}`} from={fromStr} to={toStr} result={result} openAdvances={openAdvances} />
      </div>
    );
  }

  // Admin: project drill-down (all-time only).
  const [projects, workers, prices, activity, accommodations, tables] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { active: true, role: { not: "CLIENT" } }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({}),
    prisma.activityLog.findMany({
      include: { projectWorker: true, table: { include: { section: true } } },
    }),
    prisma.accommodation.findMany({ include: { workers: true } }),
    prisma.table.findMany({
      select: { rows: true, cols: true, skipped: true, section: { select: { projectId: true } } },
    }),
  ]);

  // Module capacity (rows*cols-skipped) per project.
  const capacityByProject = new Map<string, number>();
  for (const tbl of tables) {
    const pid = tbl.section.projectId;
    capacityByProject.set(pid, (capacityByProject.get(pid) ?? 0) + Math.max(0, tbl.rows * tbl.cols - tbl.skipped));
  }

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
    activity: activity.map((a) => ({
      userId: a.projectWorker.userId,
      projectId: a.table.section.projectId,
      sectionId: a.table.section.id,
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
  };

  const projectComputations = projects.map((p) => ({
    project: p,
    result: computeWages({ ...baseInput, projectId: p.id }),
  }));

  const anyMixed = projectComputations.some(({ result }) => result.mixedCurrencies);

  const projectRows = projectComputations.map(({ project, result }) => {
    const totals = sumWageRows(result.rows);
    return {
      id: project.id,
      name: project.name,
      location: project.location,
      status: project.status,
      tie: totals.tie,
      connect: totals.connect,
      tieCount: totals.tieCount,
      connectCount: totals.connectCount,
      capacity: capacityByProject.get(project.id) ?? 0,
      accommodation: totals.accommodation,
      wage: totals.wage,
      warnings: totals.warnings,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-navy">{t("title")}</h1>
        <Link href="/wages/advances" className="text-sm text-accent hover:underline">{tNav("advances")} →</Link>
      </div>
      <AdminProjectList projects={projectRows} mixedCurrencies={anyMixed} />
    </div>
  );
}
