import { getTranslations } from "next-intl/server";
import { computeModules } from "@/lib/portal/modules";
import { TableLogger } from "@/app/[locale]/(portal)/projects/[projectId]/log/TableLogger";

export type ActivityLog = {
  id: string;
  projectWorkerId: string;
  action: "TIE" | "CONNECT";
  count: number;
  workDate: Date;
  createdAt: Date;
};

export type Claim = {
  id: string;
  projectWorkerId: string;
  projectWorker: { userId: string; user: { name: string } };
};

export type Table = {
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

/**
 * Renders one section's table cards. Used by ProjectLogView (log page and
 * dashboard) and by the standalone section page.
 */
export async function SectionTables({
  tables,
  assignedWorkers,
  allActiveWorkers,
  projectWorkerId,
  isAdmin,
  isClosed,
  sectionInvoiced = false,
}: {
  tables: Table[];
  assignedWorkers: { id: string; userId: string; name: string }[];
  allActiveWorkers: { id: string; name: string }[];
  projectWorkerId: string | null;
  isAdmin: boolean;
  isClosed: boolean;
  sectionInvoiced?: boolean;
}) {
  const t = await getTranslations("log");
  const tProj = await getTranslations("portalProjects");

  return (
    <div className="space-y-3">
      {tables.map((tbl) => {
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
            sectionInvoiced={sectionInvoiced}
            selectableWorkers={selectableWorkers}
            labels={{
              iTied: t("iTied"),
              iConnected: t("iConnected"),
              workDate: t("workDate"),
              submit: t("submit"),
              progressTied: t("progressTied"),
              progressConnected: t("progressConnected"),
              recent: t("recentEntries"),
              noEntries: t("noEntriesYet"),
              locked: t("lockedInvoiced"),
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
              logForWorker: t("logForWorker"),
              logEntry: t("logEntry"),
              noWorkersToClaim: t("noWorkersToClaim"),
              notInProject: t("notInProject"),
              done: t("done"),
            }}
          />
        );
      })}
    </div>
  );
}
