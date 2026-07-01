import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ALL_TIME_FROM, ALL_TIME_TO, computeWages } from "@/lib/portal/wages";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const url = new URL(req.url);
  // We invoice per section, not by time. Dates are optional; without them the
  // export covers all time.
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const projectId = url.searchParams.get("projectId") || null;
  const from = fromStr ? new Date(fromStr) : ALL_TIME_FROM;
  const to = toStr ? new Date(toStr) : ALL_TIME_TO;

  const [workers, prices, activity, accommodations, projects] = await Promise.all([
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
    prisma.project.findMany({ select: { id: true, companyPriceTie: true, companyPriceConnect: true } }),
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
    companyPrices: projects.map((p) => ({
      projectId: p.id,
      companyPriceTie: Number(p.companyPriceTie),
      companyPriceConnect: Number(p.companyPriceConnect),
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

  const header = ["Worker", "Modules tied", "Modules connected", "Tie earnings", "Connect earnings", "Earnings total", "Accommodation", "Wage", "Company earnings", "Profit", "Warnings"];
  const lines = [header.join(",")];
  for (const r of result.rows) {
    if (r.earnings === 0 && r.accommodation === 0 && r.breakdown.tieCount === 0 && r.breakdown.connectCount === 0) continue;
    lines.push([
      JSON.stringify(r.name),
      String(r.breakdown.tieCount),
      String(r.breakdown.connectCount),
      r.breakdown.tie.toFixed(2),
      r.breakdown.connect.toFixed(2),
      r.earnings.toFixed(2),
      r.accommodation.toFixed(2),
      r.wage.toFixed(2),
      r.companyEarnings.toFixed(2),
      r.profit.toFixed(2),
      JSON.stringify(r.warnings.join("; ")),
    ].join(","));
  }
  const body = lines.join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wages-${fromStr && toStr ? `${fromStr}-to-${toStr}` : "all-time"}.csv"`,
    },
  });
}
