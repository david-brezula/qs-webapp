import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { getTranslations } from "next-intl/server";
import { computeWages } from "@/lib/portal/wages";
import { WagesView } from "./WagesView";

export default async function WagesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; projectId?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = sp.from ?? today;
  const toStr = sp.to ?? today;
  const projectId = sp.projectId || undefined;

  const from = new Date(fromStr);
  const to = new Date(toStr);

  const [workers, prices, activity, accommodations, projects] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({}),
    prisma.activityLog.findMany({
      where: { workDate: { gte: from, lte: to } },
      include: { projectWorker: true, table: { include: { section: true } } },
    }),
    prisma.accommodation.findMany({
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

  const t = await getTranslations("wages");

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
