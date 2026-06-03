import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { SectionsEditor } from "./SectionsEditor";
import { WorkersPanel } from "./WorkersPanel";
import { ClientPanel } from "./ClientPanel";
import { PhotosPanel } from "./PhotosPanel";
import { DocumentsPanel } from "./DocumentsPanel";
import { computeModules } from "@/lib/portal/modules";

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireAdmin();
  const { projectId } = await params;

  const [project, allWorkers, allClients] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: { orderBy: { orderIndex: "asc" }, include: { tables: { orderBy: { orderIndex: "asc" } } } },
        projectWorkers: { include: { user: true } },
        client: { select: { id: true, name: true } },
        photos: { orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }], select: { id: true, caption: true } },
        documents: { orderBy: { createdAt: "desc" }, select: { id: true, title: true } },
      },
    }),
    prisma.user.findMany({ where: { active: true, role: { not: "CLIENT" } }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!project) notFound();
  const t = await getTranslations("portalProjects");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{project.name}</h1>
      <SectionsEditor
        projectId={project.id}
        sections={project.sections.map((s) => ({
          id: s.id,
          name: s.name,
          tables: s.tables.map((tb) => ({
            id: tb.id,
            name: tb.name,
            rows: tb.rows,
            cols: tb.cols,
            skipped: tb.skipped,
            modules: computeModules({ rows: tb.rows, cols: tb.cols, skipped: tb.skipped }),
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
          bulkAdd: t("bulkAdd"),
          namePrefix: t("namePrefix"),
          startNumber: t("startNumber"),
          quantity: t("quantity"),
          addQuantityTpl: t("addQuantity", { count: "{count}" }),
        }}
      />

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-navy mb-4">{t("assignedWorkers")}</h2>
        <WorkersPanel
          projectId={project.id}
          assigned={project.projectWorkers.map((pw) => ({
            userId: pw.userId,
            name: pw.user.name,
            email: pw.user.email ?? pw.user.username,
            priceTie: Number(pw.priceTie),
            priceConnect: Number(pw.priceConnect),
          }))}
          available={allWorkers
            .filter((u) => !project.projectWorkers.find((pw) => pw.userId === u.id))
            .map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email ?? u.username,
              defaultPriceTie: Number(u.defaultPriceTie),
              defaultPriceConnect: Number(u.defaultPriceConnect),
            }))}
          labels={{
            assignWorker: t("assignWorker"),
            priceTie: t("priceTie"),
            priceConnect: t("priceConnect"),
          }}
        />
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-navy">{t("client")}</h2>
        <ClientPanel projectId={project.id} current={project.client} clients={allClients}
          labels={{ assign: t("assignClient"), clear: t("clearClient") }} />
      </div>
      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-navy">{t("photos")}</h2>
        <PhotosPanel projectId={project.id} photos={project.photos}
          labels={{ upload: t("upload"), caption: t("caption"), delete: t("deleteLabel") }} />
      </div>
      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-navy">{t("documents")}</h2>
        <DocumentsPanel projectId={project.id} documents={project.documents}
          labels={{ upload: t("upload"), title: t("docTitle"), delete: t("deleteLabel") }} />
      </div>
    </div>
  );
}
