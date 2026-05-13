import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { Card } from "@/components/ui/Card";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("nav");

  const myAssignments = (
    await prisma.projectWorker.findMany({
      where: { userId: user.id, project: { status: "ACTIVE" } },
      include: { project: true },
      orderBy: { project: { createdAt: "desc" } },
    })
  ).map((pw) => pw.project);

  const allProjects =
    user.role === "ADMIN"
      ? await prisma.project.findMany({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const myIds = new Set(myAssignments.map((p) => p.id));
  const otherProjects = allProjects.filter((p) => !myIds.has(p.id));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("dashboard")}</h1>

      {myAssignments.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/60 mb-4">
            My assignments
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myAssignments.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}/log`}>
                <Card>
                  <h3 className="text-lg font-semibold text-navy">{p.name}</h3>
                  {p.location && <p className="text-sm text-muted">{p.location}</p>}
                  <p className="mt-2 text-xs text-accent font-semibold">Log work →</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {user.role === "ADMIN" && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/60 mb-4">
            {myAssignments.length > 0 ? "Other active projects" : "Active projects"}
          </h2>
          {otherProjects.length === 0 && myAssignments.length === 0 ? (
            <p className="text-sm text-muted">No active projects.</p>
          ) : otherProjects.length === 0 ? (
            <p className="text-sm text-muted">You&apos;re assigned to every active project.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {otherProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card>
                    <h3 className="text-lg font-semibold text-navy">{p.name}</h3>
                    {p.location && <p className="text-sm text-muted">{p.location}</p>}
                    <p className="mt-2 text-xs text-slate-ink">View →</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {user.role !== "ADMIN" && myAssignments.length === 0 && (
        <p className="text-sm text-muted">No active projects assigned to you.</p>
      )}
    </div>
  );
}
