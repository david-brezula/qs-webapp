import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/portal/session";
import { getClientProject } from "@/lib/portal/client-projects";
import { ClientProjectTabs } from "@/components/client/ClientProjectTabs";

export default async function ClientProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { clientId } = await requireClient();
  const { projectId } = await params;
  const t = await getTranslations("clientPortal");

  const project = await getClientProject(clientId, projectId);
  if (!project) notFound();

  return (
    <div>
      <Link href="/portal" className="text-sm text-navy underline">← {t("backToProjects")}</Link>
      <div className="mb-6 mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{project.name}</h1>
          {project.location && <p className="text-sm text-muted">{project.location}</p>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-navy">{project.progressPercent}%</div>
          <div className="text-xs text-muted">{t("complete")}</div>
        </div>
      </div>
      <ClientProjectTabs project={project} />
    </div>
  );
}
