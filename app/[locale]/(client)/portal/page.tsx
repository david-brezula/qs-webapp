import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/portal/session";
import { listClientProjects } from "@/lib/portal/client-projects";
import { Card } from "@/components/ui/Card";

export default async function ClientDashboardPage() {
  const { clientId } = await requireClient();
  const t = await getTranslations("clientPortal");
  const projects = await listClientProjects(clientId);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-navy">{t("myProjects")}</h1>
      {projects.length === 0 && <p className="text-sm text-muted">{t("noProjects")}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/portal/${p.id}`}>
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy">{p.name}</h2>
                <span className="text-xs text-muted">
                  {p.status === "ACTIVE" ? t("statusActive") : t("statusClosed")}
                </span>
              </div>
              {p.location && <p className="text-sm text-muted">{p.location}</p>}
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                  <div className="h-full bg-navy" style={{ width: `${p.progressPercent}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-ink">{p.progressPercent}% · {t("complete")}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
