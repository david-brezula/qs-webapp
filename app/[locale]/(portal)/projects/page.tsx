import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";
import { computeModules } from "@/lib/portal/modules";

export default async function ProjectsListPage() {
  await requireAdmin();
  const t = await getTranslations("portalProjects");
  const tCommon = await getTranslations("common");

  const projects = await prisma.project.findMany({
    include: {
      sections: { include: { tables: { include: { activityLogs: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-navy">{t("list")}</h1>
        <Button href="/projects/new" variant="primary">{t("new")}</Button>
      </div>
      <DataTable
        headers={[tCommon("name"), "Location", t("modules"), tCommon("status"), tCommon("actions")]}
        empty={t("noProjects")}
        rows={projects.map((p) => {
          let total = 0, tied = 0, connected = 0;
          for (const s of p.sections)
            for (const tbl of s.tables) {
              total += computeModules({ rows: tbl.rows, cols: tbl.cols, skipped: tbl.skipped });
              for (const a of tbl.activityLogs) {
                if (a.action === "TIE") tied += a.count;
                else connected += a.count;
              }
            }
          return [
            <Link key="n" href={`/projects/${p.id}`} className="text-navy underline">{p.name}</Link>,
            p.location ?? "—",
            `${tied}/${total} · ${connected}/${total}`,
            p.status === "ACTIVE" ? tCommon("active") : tCommon("closed"),
            <Link key="e" href={`/projects/${p.id}/edit`} className="text-navy underline">{tCommon("edit")}</Link>,
          ];
        })}
      />
    </div>
  );
}
