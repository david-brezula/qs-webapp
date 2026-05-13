import { getTranslations } from "next-intl/server";
import { computeModules } from "@/lib/portal/modules";
import { TableLogger } from "@/app/(app)/projects/[projectId]/log/TableLogger";

type ActivityLog = {
  id: string;
  projectWorkerId: string;
  action: "TIE" | "CONNECT";
  count: number;
  workDate: Date;
  createdAt: Date;
};

type Claim = {
  id: string;
  projectWorkerId: string;
  projectWorker: { userId: string; user: { name: string } };
};

type Table = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  skipped: number;
  activityLogs: ActivityLog[];
  claims: Claim[];
};

type Section = {
  id: string;
  name: string;
  tables: Table[];
};

export async function ProjectLogView({
  project,
  projectWorkerId,
  isAdmin,
}: {
  project: {
    id: string;
    name: string;
    location: string | null;
    status: "ACTIVE" | "CLOSED";
    sections: Section[];
  };
  projectWorkerId: string | null;
  isAdmin: boolean;
}) {
  const t = await getTranslations("log");
  const tProj = await getTranslations("projects");
  const isClosed = project.status === "CLOSED";

  return (
    <>
      {project.sections.length === 0 && (
        <p className="text-sm text-muted">No sections yet.</p>
      )}
      {project.sections.map((s) => (
        <section key={s.id} className="mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-navy/60 mb-3">
            {s.name}
          </h3>
          <div className="space-y-3">
            {s.tables.map((tbl) => {
              const total = computeModules({
                rows: tbl.rows,
                cols: tbl.cols,
                skipped: tbl.skipped,
              });
              const tied = tbl.activityLogs
                .filter((l) => l.action === "TIE")
                .reduce((a, b) => a + b.count, 0);
              const connected = tbl.activityLogs
                .filter((l) => l.action === "CONNECT")
                .reduce((a, b) => a + b.count, 0);

              const myClaim = projectWorkerId
                ? tbl.claims.find((c) => c.projectWorkerId === projectWorkerId) ?? null
                : null;
              const hasMyActivity = projectWorkerId
                ? tbl.activityLogs.some((l) => l.projectWorkerId === projectWorkerId)
                : false;

              return (
                <TableLogger
                  key={tbl.id}
                  table={{ id: tbl.id, name: tbl.name, total, tied, connected }}
                  myLogs={
                    projectWorkerId
                      ? tbl.activityLogs
                          .filter((l) => l.projectWorkerId === projectWorkerId)
                          .slice(0, 5)
                          .map((l) => ({
                            id: l.id,
                            action: l.action,
                            count: l.count,
                            workDate: l.workDate.toISOString().slice(0, 10),
                            createdAt: l.createdAt.toISOString(),
                          }))
                      : []
                  }
                  claims={tbl.claims.map((c) => ({
                    id: c.id,
                    userId: c.projectWorker.userId,
                    name: c.projectWorker.user.name,
                  }))}
                  myClaim={myClaim ? { id: myClaim.id } : null}
                  hasMyActivity={hasMyActivity}
                  isClosed={isClosed}
                  isAdmin={isAdmin}
                  isAssigned={Boolean(projectWorkerId)}
                  labels={{
                    iTied: t("iTied"),
                    iConnected: t("iConnected"),
                    workDate: t("workDate"),
                    submit: t("submit"),
                    progress: t("tableProgress", { tied, connected, total }),
                    recent: t("recentEntries"),
                    locked: t("editWindowOver"),
                    overCap: t("overCap", { remaining: "{r}" }),
                    tied: tProj("tied"),
                    connected: tProj("connected"),
                    claim: t("claim"),
                    release: t("release"),
                    claimedBy: t("claimedBy"),
                    noClaims: t("noClaims"),
                    notAssigned: t("notAssigned"),
                    claimToLog: t("claimToLog"),
                    cannotRelease: t("cannotRelease"),
                  }}
                />
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
