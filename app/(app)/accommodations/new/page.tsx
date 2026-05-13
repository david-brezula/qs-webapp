import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { getTranslations } from "next-intl/server";
import { AccommodationForm } from "../AccommodationForm";

export default async function NewAccommodationPage() {
  await requireAdmin();
  const [workers, projects] = await Promise.all([
    prisma.user.findMany({ where: { active: true, role: "WORKER" }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const t = await getTranslations("accommodations");
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("new")}</h1>
      <AccommodationForm
        workers={workers.map((w) => ({ id: w.id, name: w.name, email: w.email ?? w.username }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        selectedWorkerIds={[]}
      />
    </div>
  );
}
