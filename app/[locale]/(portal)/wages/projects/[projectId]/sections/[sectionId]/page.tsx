import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { ALL_TIME_FROM, ALL_TIME_TO, computeWages } from "@/lib/portal/wages";
import { AdminSectionWageView } from "../../../../AdminSectionWageView";

export default async function AdminSectionWagePage({
  params,
}: {
  params: Promise<{ projectId: string; sectionId: string }>;
}) {
  await requireAdmin();
  const { projectId, sectionId } = await params;

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
    activity: activity.map((a) => ({
      userId: a.projectWorker.userId,
      projectId,
      sectionId,
      action: a.action,
      count: a.count,
      workDate: a.workDate,
    })),
    accommodations: [],
  });

  const workerRows = result.rows
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      tie: r.breakdown.tie,
      connect: r.breakdown.connect,
      earnings: r.earnings,
      warnings: r.warnings,
    }))
    .filter((r) => r.earnings !== 0);

  return (
    <div>
      <Link
        href={`/wages/projects/${project.id}`}
        className="text-sm text-accent hover:underline"
      >
        ‹ {project.name}
      </Link>
      <h1 className="mt-2 mb-8 text-2xl font-semibold text-navy">{section.name}</h1>
      <AdminSectionWageView workers={workerRows} />
    </div>
  );
}
