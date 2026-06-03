import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { computeWages } from "@/lib/portal/wages";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  if (!fromStr || !toStr) return new NextResponse("Missing dates", { status: 400 });

  const projectId = url.searchParams.get("projectId") || null;
  const from = new Date(fromStr);
  const to = new Date(toStr);

  const [workers, prices, activity, accommodations] = await Promise.all([
    prisma.user.findMany({ where: { active: true, role: { not: "CLIENT" } } }),
    prisma.projectWorker.findMany({}),
    prisma.activityLog.findMany({
      where: { workDate: { gte: from, lte: to } },
      include: { projectWorker: true, table: { include: { section: true } } },
    }),
    prisma.accommodation.findMany({
      where: {
        startDate: { lte: to },
        endDate: { gte: from },
      },
      include: { workers: true },
    }),
  ]);

  const result = computeWages({
    from,
    to,
    projectId,
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

  const header = ["Worker", "Tie earnings", "Connect earnings", "Earnings total", "Accommodation", "Wage", "Warnings"];
  const lines = [header.join(",")];
  for (const r of result.rows) {
    if (r.earnings === 0 && r.accommodation === 0) continue;
    lines.push([
      JSON.stringify(r.name),
      r.breakdown.tie.toFixed(2),
      r.breakdown.connect.toFixed(2),
      r.earnings.toFixed(2),
      r.accommodation.toFixed(2),
      r.wage.toFixed(2),
      JSON.stringify(r.warnings.join("; ")),
    ].join(","));
  }
  const body = lines.join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wages-${fromStr}-to-${toStr}.csv"`,
    },
  });
}
