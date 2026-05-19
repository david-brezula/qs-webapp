import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { ProjectSectionList } from "@/components/portal/ProjectSectionList";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const tCommon = await getTranslations("common");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: { tables: { orderBy: { orderIndex: "asc" } } },
      },
      projectWorkers: { select: { userId: true } },
    },
  });
  if (!project) notFound();

  // Workers can only view projects they're assigned to
  const isAssigned = project.projectWorkers.some((pw) => pw.userId === user.id);
  if (user.role !== "ADMIN" && !isAssigned) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{project.name}</h1>
          {project.location && <p className="text-sm text-muted">{project.location}</p>}
        </div>
        <div className="flex gap-2">
          {user.role === "ADMIN" && (
            <Button href={`/projects/${project.id}/edit`} variant="secondary">{tCommon("edit")}</Button>
          )}
        </div>
      </div>

      <ProjectSectionList projectId={project.id} sections={project.sections} />
    </div>
  );
}
