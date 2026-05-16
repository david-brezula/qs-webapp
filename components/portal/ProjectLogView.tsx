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
  totalTied: number;
  totalConnected: number;
  myLogs: ActivityLog[];
  hasMyActivity: boolean;
  claims: Claim[];
};

type Section = {
  id: string;
  name: string;
  tables: Table[];
};

export async function ProjectLogView({
  project,
  assignedWorkers,
  allActiveWorkers,
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
  assignedWorkers: { id: string; userId: string; name: string }[];
  allActiveWorkers: { id: string; name: string }[];
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
              const tied = tbl.totalTied;
              const connected = tbl.totalConnected;

              const myClaim = projectWorkerId
                ? tbl.claims.find((c) => c.projectWorkerId === projectWorkerId) ?? null
                : null;
              const hasMyActivity = tbl.hasMyActivity;

              const claimedUserIds = new Set(tbl.claims.map((c) => c.projectWorker.userId));
              const assignedUserIds = new Set(assignedWorkers.map((w) => w.userId));
              const selectableWorkers = allActiveWorkers
                .filter((u) => !claimedUserIds.has(u.id))
                .map((u) => ({
                  userId: u.id,
                  name: u.name,
                  inProject: assignedUserIds.has(u.id),
                }));

              return (
                <TableLogger
                  key={tbl.id}
                  table={{ id: tbl.id, name: tbl.name, total, tied, connected }}
                  myLogs={tbl.myLogs.map((l) => ({
                    id: l.id,
                    action: l.action,
                    count: l.count,
                    workDate: l.workDate.toISOString().slice(0, 10),
                    createdAt: l.createdAt.toISOString(),
                  }))}
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
                  selectableWorkers={selectableWorkers}
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
                    addClaimFor: t("addClaimFor"),
                    selectWorker: t("selectWorker"),
                    add: t("add"),
                    noWorkersToClaim: t("noWorkersToClaim"),
                    notInProject: t("notInProject"),
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
