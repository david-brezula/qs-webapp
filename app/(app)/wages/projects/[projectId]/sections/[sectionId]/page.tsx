import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { ALL_TIME_FROM, ALL_TIME_TO, computeWages } from "@/lib/portal/wages";
import { AdminSectionWageView } from "../../../../AdminSectionWageView";

export default async function AdminSectionWagePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; sectionId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin();
  const { projectId, sectionId } = await params;
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = sp.from ?? today;
  const toStr = sp.to ?? today;
  const from = new Date(fromStr);
  const to = new Date(toStr);

  const [section, project, workers, prices, activity] = await Promise.all([
    prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true, name: true, projectId: true },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({ where: { projectId } }),
    prisma.activityLog.findMany({
      where: { table: { sectionId } },
      include: { projectWorker: true },
    }),
  ]);

  if (!section || !project) notFound();
  if (section.projectId !== projectId) notFound();

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
      sectionId,
      action: a.action,
      count: a.count,
      workDate: a.workDate,
    })),
    accommodations: [],
    projectId,
    sectionId,
  };

  const allTime = computeWages({ ...baseInput, from: ALL_TIME_FROM, to: ALL_TIME_TO });
  const ranged = computeWages({ ...baseInput, from, to });

  const allTimeById = new Map(allTime.rows.map((r) => [r.userId, r] as const));
  const rangedById = new Map(ranged.rows.map((r) => [r.userId, r] as const));

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
          warnings: at?.warnings ?? [],
        },
        range: {
          tie: rg?.breakdown.tie ?? 0,
          connect: rg?.breakdown.connect ?? 0,
          earnings: rg?.earnings ?? 0,
        },
      };
    })
    .filter((r) => r.allTime.earnings !== 0);

  return (
    <div>
      <Link
        href={`/wages/projects/${project.id}?from=${fromStr}&to=${toStr}`}
        className="text-sm text-accent hover:underline"
      >
        ‹ {project.name}
      </Link>
      <h1 className="mt-2 mb-8 text-2xl font-semibold text-navy">{section.name}</h1>
      <AdminSectionWageView from={fromStr} to={toStr} workers={workerRows} />
    </div>
  );
}
