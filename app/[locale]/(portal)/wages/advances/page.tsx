import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { withWorkerScope } from "@/lib/prisma-worker";
import { requireUser } from "@/lib/portal/session";
import { MyAdvancesView } from "./MyAdvancesView";
import { AdminAdvancesView } from "./AdminAdvancesView";

export default async function AdvancesPage() {
  const user = await requireUser();
  const t = await getTranslations("advances");

  if (user.role !== "ADMIN") {
    const rows = await withWorkerScope(user.id, (tx) =>
      tx.advanceRequest.findMany({
        orderBy: { requestedAt: "desc" },
        include: { section: { select: { name: true } } },
      }),
    );
    return (
      <div>
        <h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>
        <MyAdvancesView
          requests={rows.map((r) => ({
            id: r.id,
            amount: Number(r.amount).toFixed(2),
            currency: r.currency,
            note: r.note,
            status: r.status,
            requestedAt: r.requestedAt.toLocaleDateString(),
            sectionName: r.section?.name ?? null,
          }))}
        />
      </div>
    );
  }

  const [rows, allSections, projectWorkers] = await Promise.all([
    prisma.advanceRequest.findMany({
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      include: { user: true, section: { select: { name: true } } },
    }),
    prisma.section.findMany({ select: { id: true, name: true, projectId: true }, orderBy: { orderIndex: "asc" } }),
    prisma.projectWorker.findMany({ select: { userId: true, projectId: true } }),
  ]);

  const projectsByUser = new Map<string, Set<string>>();
  for (const pw of projectWorkers) {
    const set = projectsByUser.get(pw.userId) ?? new Set<string>();
    set.add(pw.projectId);
    projectsByUser.set(pw.userId, set);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>
      <AdminAdvancesView
        requests={rows.map((r) => ({
          id: r.id,
          workerName: r.user.name,
          amount: Number(r.amount).toFixed(2),
          currency: r.currency,
          note: r.note,
          status: r.status,
          requestedAt: r.requestedAt.toLocaleDateString(),
          sectionName: r.section?.name ?? null,
          settledAt: r.settledAt ? r.settledAt.toLocaleDateString() : null,
          candidateSections: allSections.filter((s) => projectsByUser.get(r.userId)?.has(s.projectId)).map((s) => ({ id: s.id, name: s.name })),
        }))}
      />
    </div>
  );
}
