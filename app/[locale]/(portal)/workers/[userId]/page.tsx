import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { EditWorkerForm } from "./EditWorkerForm";
import { WorkerActivityLog, type WorkerLogRow } from "./WorkerActivityLog";

export default async function EditWorkerPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;
  const t = await getTranslations("workers");
  const [user, logs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.activityLog.findMany({
      where: { projectWorker: { userId } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { table: { include: { section: { include: { project: true } } } } },
    }),
  ]);
  if (!user) notFound();
  // Clients are managed under /clients, not the worker editor.
  if (user.role === "CLIENT") notFound();

  const logRows: WorkerLogRow[] = logs.map((l) => ({
    id: l.id,
    action: l.action,
    count: l.count,
    workDate: l.workDate.toISOString().slice(0, 10),
    createdAt: l.createdAt.toISOString(),
    projectId: l.table.section.project.id,
    projectName: l.table.section.project.name,
    sectionId: l.table.sectionId,
    sectionName: l.table.section.name,
    tableName: l.table.name,
    editable: true, // admin has unrestricted edit/delete
  }));

  return (
    <div>
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold text-navy mb-2">{user.name}</h1>
        <p className="text-sm text-muted mb-1">
          <span className="font-mono">{user.username}</span>
          {user.email && <span className="ml-2">· {user.email}</span>}
        </p>
        {user.mustChangePassword && (
          <p className="text-xs text-accent font-semibold mb-6 mt-2">
            Must change password on next login
          </p>
        )}
        <EditWorkerForm
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            language: user.language,
            active: user.active,
            defaultPriceTie: Number(user.defaultPriceTie),
            defaultPriceConnect: Number(user.defaultPriceConnect),
          }}
        />
      </div>

      <div className="mt-12 pt-6 border-t border-border-soft">
        <h2 className="text-lg font-semibold text-navy mb-4">{t("activityTitle")}</h2>
        <WorkerActivityLog logs={logRows} />
      </div>
    </div>
  );
}
