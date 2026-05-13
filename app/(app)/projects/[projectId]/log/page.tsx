import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { ProjectLogView } from "@/components/portal/ProjectLogView";

export default async function LogPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const t = await getTranslations("log");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: {
          tables: {
            orderBy: { orderIndex: "asc" },
            include: {
              activityLogs: { orderBy: { createdAt: "desc" } },
              claims: { include: { projectWorker: { include: { user: true } } } },
            },
          },
        },
      },
      projectWorkers: { where: { userId: user.id } },
    },
  });
  if (!project) notFound();
  if (user.role !== "ADMIN" && project.projectWorkers.length === 0) notFound();

  const projectWorkerId = project.projectWorkers[0]?.id ?? null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-1">{project.name}</h1>
      <p className="text-sm text-muted mb-8">{t("title")}</p>

      <ProjectLogView
        project={{
          id: project.id,
          name: project.name,
          location: project.location,
          status: project.status,
          sections: project.sections,
        }}
        projectWorkerId={projectWorkerId}
        isAdmin={user.role === "ADMIN"}
      />
    </div>
  );
}
