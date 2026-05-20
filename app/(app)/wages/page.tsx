import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { getTranslations } from "next-intl/server";
import {
  ALL_TIME_FROM,
  ALL_TIME_TO,
  computeWages,
  computeWagesByProject,
  sumWageRows,
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
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = sp.from ?? today;
  const toStr = sp.to ?? today;
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const t = await getTranslations("wages");

  // Worker: only their own wages, read through the RLS-enforced connection.
  if (user.role !== "ADMIN") {
    const data = await withWorkerScope(user.id, async (tx) => {
      const [prices, activity, accommodations, projects] = await Promise.all([
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
      ]);
      return { prices, activity, accommodations, projects };
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

    return (
      <div>
        <h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>
        <MyWagesView from={fromStr} to={toStr} result={result} />
      </div>
    );
  }

  // Admin: project drill-down. Fetch all data once, compute per-project
  // all-time and ranged totals from the same input.
  const [projects, workers, prices, activity, accommodations] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({}),
    prisma.activityLog.findMany({
      include: { projectWorker: true, table: { include: { section: true } } },
    }),
    prisma.accommodation.findMany({ include: { workers: true } }),
  ]);

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

  const projectComputations = projects.map((p) => {
    const at = computeWages({ ...baseInput, projectId: p.id, from: ALL_TIME_FROM, to: ALL_TIME_TO });
    const rg = computeWages({ ...baseInput, projectId: p.id, from, to });
    return { p, at, rg };
  });
  const anyMixed = projectComputations.some(({ at, rg }) => at.mixedCurrencies || rg.mixedCurrencies);
  const projectRows = projectComputations.map(({ p, at, rg }) => {
    const atT = sumWageRows(at.rows);
    const rgT = sumWageRows(rg.rows);
    return {
      id: p.id,
      name: p.name,
      location: p.location,
      status: p.status,
      allTime: {
        tie: atT.tie,
        connect: atT.connect,
        earnings: atT.earnings,
        accommodation: atT.accommodation,
        wage: atT.wage,
        warnings: atT.warnings,
      },
      range: {
        tie: rgT.tie,
        connect: rgT.connect,
        earnings: rgT.earnings,
        accommodation: rgT.accommodation,
        wage: rgT.wage,
      },
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>
      <AdminProjectList
        from={fromStr}
        to={toStr}
        projects={projectRows}
        mixedCurrencies={anyMixed}
      />
    </div>
  );
}
