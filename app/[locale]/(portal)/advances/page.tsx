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
      tx.advanceRequest.findMany({ orderBy: { requestedAt: "desc" } }),
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
          }))}
        />
      </div>
    );
  }

  const rows = await prisma.advanceRequest.findMany({
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
    include: { user: true },
  });
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
        }))}
      />
    </div>
  );
}
