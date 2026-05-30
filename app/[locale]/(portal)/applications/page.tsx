import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { DataTable } from "@/components/portal/DataTable";

export default async function ApplicationsListPage() {
  await requireAdmin();
  const t = await getTranslations("applications");
  const tCommon = await getTranslations("common");
  const apps = await prisma.workerApplication.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("list")}</h1>
      <DataTable
        headers={[tCommon("name"), t("trades"), t("experience"), tCommon("status"), t("received"), tCommon("actions")]}
        rows={apps.map((a) => [
          a.name,
          a.trades.join(", "),
          a.experienceYears != null ? String(a.experienceYears) : "—",
          t(`status.${a.status}`),
          a.createdAt.toLocaleDateString(),
          <Link key={a.id} href={`/applications/${a.id}`} className="text-navy underline">
            {tCommon("edit")}
          </Link>,
        ])}
      />
    </div>
  );
}
