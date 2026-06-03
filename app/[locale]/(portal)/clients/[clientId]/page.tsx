import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { EditClientForm } from "./EditClientForm";

export default async function EditClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  await requireAdmin();
  const { clientId } = await params;
  const t = await getTranslations("clients");

  const [client, assignedProjects, unassignedProjects] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.project.findMany({ where: { clientId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { clientId: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!client) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-8 text-2xl font-semibold text-navy">{client.name}</h1>
      <EditClientForm
        client={{ id: client.id, name: client.name, company: client.company, email: client.email, active: client.active }}
        assigned={assignedProjects}
        available={unassignedProjects}
        labels={{
          name: t("nameLabel"), company: t("company"), email: t("emailLabel"), active: t("active"),
          save: t("save"), resetPassword: t("resetPassword"), projects: t("projects"),
          assign: t("assignProject"), unassign: t("unassign"), tempPassword: t("tempPassword"),
        }}
      />
    </div>
  );
}
