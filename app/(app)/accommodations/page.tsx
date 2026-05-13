import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";

export default async function AccommodationsListPage() {
  await requireAdmin();
  const t = await getTranslations("accommodations");
  const tCommon = await getTranslations("common");
  const accs = await prisma.accommodation.findMany({
    include: { workers: true, project: true },
    orderBy: { startDate: "desc" },
  });
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-navy">{t("list")}</h1>
        <Button href="/accommodations/new" variant="primary">{t("new")}</Button>
      </div>
      <DataTable
        headers={[tCommon("name"), t("startDate"), t("endDate"), t("totalCost"), "Workers", tCommon("actions")]}
        rows={accs.map((a) => [
          a.name,
          a.startDate.toISOString().slice(0, 10),
          a.endDate.toISOString().slice(0, 10),
          `${a.totalCost.toString()} ${a.currency}`,
          a.workers.length,
          <Link key={a.id} href={`/accommodations/${a.id}`} className="text-navy underline">{tCommon("edit")}</Link>,
        ])}
      />
    </div>
  );
}
