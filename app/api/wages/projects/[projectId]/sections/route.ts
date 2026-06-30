import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withWorkerScope } from "@/lib/prisma-worker";
import { ALL_TIME_FROM, ALL_TIME_TO, computeWagesBySection } from "@/lib/portal/wages";
import type { WorkerSectionRow } from "@/app/[locale]/(portal)/wages/section-row";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { projectId } = await params;
  if (!projectId) {
    return new NextResponse("Bad Request", { status: 400 });
  }
  // We invoice per section, so the breakdown covers ALL TIME (no date filter).
  const userId = session.user.id as string;

  const data = await withWorkerScope(userId, async (tx) => {
    const [prices, activity, sections, accommodations, invoices, settledAdvances] = await Promise.all([
      tx.projectWorker.findMany({ where: { projectId, userId } }),
      tx.activityLog.findMany({
        where: {
          table: { section: { projectId } },
        },
        include: { projectWorker: true, table: { include: { section: true } } },
      }),
      tx.section.findMany({ where: { projectId }, orderBy: { orderIndex: "asc" } }),
      tx.accommodation.findMany({
        where: { projectId },
        include: { workers: true },
      }),
      tx.sectionInvoice.findMany({
        where: { projectWorker: { projectId, userId } },
        select: { sectionId: true, invoicedAt: true },
      }),
      tx.advanceRequest.findMany({
        where: { userId, status: "SETTLED", section: { projectId } },
        select: { sectionId: true, amount: true },
      }),
    ]);
    return { prices, activity, sections, accommodations, invoices, settledAdvances };
  });

  const sectionRows = computeWagesBySection({
    from: ALL_TIME_FROM,
    to: ALL_TIME_TO,
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
    accommodations: data.accommodations.map((acc) => ({
      id: acc.id,
      totalCost: Number(acc.totalCost),
      currency: acc.currency,
      startDate: acc.startDate,
      endDate: acc.endDate,
      workerIds: acc.workers.map((w) => w.userId),
      projectId: acc.projectId,
      sectionId: acc.sectionId,
    })),
    sections: data.sections.map((s) => ({ id: s.id, name: s.name })),
    settledAdvances: data.settledAdvances
      .filter((a) => a.sectionId)
      .map((a) => ({ sectionId: a.sectionId as string, amount: Number(a.amount) })),
  });

  // invoicedAt is now nullable (a row may exist only for an admin-set payment);
  // a section counts as invoiced only when invoicedAt is set. paidAt is never
  // selected here, so the worker portal never sees the paid state.
  const invoicedAt = new Map(
    data.invoices.filter((i) => i.invoicedAt).map((i) => [i.sectionId, i.invoicedAt!.toISOString()] as const),
  );
  const sections: WorkerSectionRow[] = sectionRows.map((s) => ({
    ...s,
    invoiced: invoicedAt.has(s.sectionId),
    invoicedAt: invoicedAt.get(s.sectionId) ?? null,
  }));

  return NextResponse.json({ sections });
}
