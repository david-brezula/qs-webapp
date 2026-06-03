import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";

export default async function ClientsListPage() {
  await requireAdmin();
  const t = await getTranslations("clients");
  const tCommon = await getTranslations("common");
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">{t("list")}</h1>
        <Button href="/clients/new" variant="primary">{t("new")}</Button>
      </div>
      <DataTable
        headers={[tCommon("name"), t("company"), tCommon("email"), t("projectsCount"), tCommon("status"), tCommon("actions")]}
        rows={clients.map((c) => [
          c.name,
          c.company ?? <span className="text-muted">—</span>,
          c.email ?? <span className="text-muted">—</span>,
          String(c._count.projects),
          c.active ? tCommon("active") : tCommon("closed"),
          <Link key={c.id} href={`/clients/${c.id}`} className="text-navy underline">{tCommon("edit")}</Link>,
        ])}
      />
    </div>
  );
}
