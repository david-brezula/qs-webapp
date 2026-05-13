import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { SectionsEditor } from "./SectionsEditor";
import { computeModules } from "@/lib/portal/modules";

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireAdmin();
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: { tables: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });
  if (!project) notFound();
  const t = await getTranslations("projects");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{project.name}</h1>
      <SectionsEditor
        projectId={project.id}
        sections={project.sections.map((s) => ({
          id: s.id,
          name: s.name,
          tables: s.tables.map((t) => ({
            id: t.id,
            name: t.name,
            rows: t.rows,
            cols: t.cols,
            skipped: t.skipped,
            modules: computeModules({ rows: t.rows, cols: t.cols, skipped: t.skipped }),
          })),
        }))}
        labels={{
          section: t("section"),
          newSection: t("newSection"),
          table: t("table"),
          newTable: t("newTable"),
          rows: t("rows"),
          cols: t("cols"),
          skipped: t("skipped"),
          modules: t("modules"),
        }}
      />
    </div>
  );
}
