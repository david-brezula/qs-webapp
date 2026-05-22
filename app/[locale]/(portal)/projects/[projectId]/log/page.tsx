import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { ProjectSectionList } from "@/components/portal/ProjectSectionList";

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
      <h1 className="text-2xl font-semibold text-navy mb-1">{project.name}</h1>
      <p className="text-sm text-muted mb-8">{t("title")}</p>

      <ProjectSectionList projectId={project.id} sections={project.sections} />
    </div>
  );
}
