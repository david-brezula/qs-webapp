import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { Card } from "@/components/ui/Card";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("nav");

  const assignments =
    user.role === "ADMIN"
      ? await prisma.project.findMany({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        })
      : (
          await prisma.projectWorker.findMany({
            where: { userId: user.id, project: { status: "ACTIVE" } },
            include: { project: true },
            orderBy: { project: { createdAt: "desc" } },
          })
        ).map((pw) => pw.project);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("dashboard")}</h1>
      {assignments.length === 0 ? (
        <p className="text-sm text-muted">No active projects.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}/log`}>
              <Card>
                <h2 className="text-lg font-semibold text-navy">{p.name}</h2>
                {p.location && <p className="text-sm text-muted">{p.location}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
