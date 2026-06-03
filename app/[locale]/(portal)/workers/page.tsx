import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";

export default async function WorkersListPage() {
  await requireAdmin();
  const t = await getTranslations("workers");
  const tCommon = await getTranslations("common");
  const users = await prisma.user.findMany({ where: { role: { not: "CLIENT" } }, orderBy: { name: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-navy">{t("list")}</h1>
        <Button href="/workers/new" variant="primary">{t("new")}</Button>
      </div>
      <DataTable
        headers={[tCommon("username"), tCommon("name"), tCommon("email"), t("role"), tCommon("status"), tCommon("actions")]}
        rows={users.map((u) => [
          <span key="u" className="font-mono text-xs">{u.username}</span>,
          u.name,
          u.email ?? <span className="text-muted">—</span>,
          u.role === "ADMIN" ? t("admin") : t("worker"),
          u.active ? tCommon("active") : tCommon("closed"),
          <Link key={u.id} href={`/workers/${u.id}`} className="text-navy underline">
            {tCommon("edit")}
          </Link>,
        ])}
      />
    </div>
  );
}
