import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { WorkerActivityLog, type WorkerLogRow } from "../workers/[userId]/WorkerActivityLog";

/**
 * Worker self-service view of their own recent activity across all projects,
 * with inline edit/remove for entries in sections they have not yet invoiced.
 * Admins always see edit/remove (the server actions enforce the real rule).
 */
export default async function MyActivityPage() {
  const user = await requireUser();
  const tNav = await getTranslations("nav");
  const t = await getTranslations("workers");
  const tLog = await getTranslations("log");

  const [logs, invoices] = await Promise.all([
    prisma.activityLog.findMany({
      where: { projectWorker: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { table: { include: { section: { include: { project: true } } } } },
    }),
    prisma.sectionInvoice.findMany({
      where: { projectWorker: { userId: user.id } },
      select: { sectionId: true },
    }),
  ]);

  const invoicedSections = new Set(invoices.map((i) => i.sectionId));
  const isAdmin = user.role === "ADMIN";

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
    editable: isAdmin || !invoicedSections.has(l.table.sectionId),
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-2">{tNav("myActivity")}</h1>
      <p className="text-sm text-muted mb-8">{t("activityHint")}</p>
      <WorkerActivityLog logs={logRows} lockedLabel={tLog("lockedInvoiced")} />
    </div>
  );
}
