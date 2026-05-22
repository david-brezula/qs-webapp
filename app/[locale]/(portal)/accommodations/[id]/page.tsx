import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { AccommodationForm } from "../AccommodationForm";

export default async function EditAccommodationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const acc = await prisma.accommodation.findUnique({
    where: { id },
    include: { workers: true },
  });
  if (!acc) notFound();

  const [workers, projects] = await Promise.all([
    prisma.user.findMany({ where: { active: true, role: "WORKER" }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{acc.name}</h1>
      <AccommodationForm
        initial={{
          id: acc.id,
          projectId: acc.projectId,
          name: acc.name,
          startDate: acc.startDate.toISOString().slice(0, 10),
          endDate: acc.endDate.toISOString().slice(0, 10),
          totalCost: Number(acc.totalCost),
          currency: acc.currency as "USD" | "EUR",
          notes: acc.notes,
        }}
        workers={workers.map((w) => ({ id: w.id, name: w.name, email: w.email ?? w.username }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        selectedWorkerIds={acc.workers.map((w) => w.userId)}
      />
    </div>
  );
}
