import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withWorkerScope } from "@/lib/prisma-worker";
import { computeWagesBySection } from "@/lib/portal/wages";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { projectId } = await params;
  const url = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(url.searchParams.get("from") ?? today);
  const to = new Date(url.searchParams.get("to") ?? today);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return new NextResponse("Invalid date parameters", { status: 400 });
  }

  const userId = session.user.id as string;

  const data = await withWorkerScope(userId, async (tx) => {
    const [prices, activity, sections] = await Promise.all([
      tx.projectWorker.findMany({ where: { projectId, userId } }),
      tx.activityLog.findMany({
        where: {
          table: { section: { projectId } },
          workDate: { gte: from, lte: to },
        },
        include: { projectWorker: true, table: { include: { section: true } } },
      }),
      tx.section.findMany({
        where: { projectId },
        orderBy: { orderIndex: "asc" },
      }),
    ]);
    return { prices, activity, sections };
  });

  const sections = computeWagesBySection({
    from,
    to,
    projectId,
    workers: [{ id: userId, name: (session.user.name as string) ?? "" }],
    prices: data.prices.map((p) => ({
      projectId: p.projectId,
      userId: p.userId,
      priceTie: Number(p.priceTie),
      priceConnect: Number(p.priceConnect),
    })),
    activity: data.activity.map((a) => ({
      userId: a.projectWorker.userId,
      projectId: a.table.section.projectId,
      sectionId: a.table.section.id,
      action: a.action,
      count: a.count,
      workDate: a.workDate,
    })),
    accommodations: [],
    sections: data.sections.map((s) => ({ id: s.id, name: s.name })),
  });

  return NextResponse.json({ sections });
}
