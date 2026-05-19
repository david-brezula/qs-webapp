import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { getTranslations } from "next-intl/server";
import { computeWages, computeWagesByProject } from "@/lib/portal/wages";
import { withWorkerScope } from "@/lib/prisma-worker";
import { WagesView } from "./WagesView";
import { MyWagesView } from "./MyWagesView";

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

  // Admin: all workers, read through the owner connection.
  const projectId = sp.projectId || undefined;

  const [workers, prices, activity, accommodations, projects] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({}),
    prisma.activityLog.findMany({
      where: { workDate: { gte: from, lte: to } },
      include: { projectWorker: true, table: { include: { section: true } } },
    }),
    prisma.accommodation.findMany({
      where: { startDate: { lte: to }, endDate: { gte: from } },
      include: { workers: true },
    }),
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const result = computeWages({
    from,
    to,
    projectId: projectId ?? null,
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
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>
      <WagesView
        from={fromStr}
        to={toStr}
        projectId={projectId ?? ""}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        result={result}
      />
    </div>
  );
}
