# Section Drill-Down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the project overview page into a two-level drill-down — a list of sections, each opening its own page of table cards — and cap the table card width.

**Architecture:** Extract the per-section table-card rendering out of `ProjectLogView` into a reusable `SectionTables` component. Add a `SectionList` component for the section-row list. Rework the project overview page to show the section list, and add a new `/projects/[projectId]/sections/[sectionId]` route that renders one section's tables. The log page and dashboard keep using `ProjectLogView` unchanged.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, next-intl, Prisma.

---

### Task 1: Cap the table card width

**Files:**
- Modify: `app/(app)/projects/[projectId]/log/TableLogger.tsx`

`TableLogger`, `ProjectLogView`, and the pages are presentational / integration
code and the project has no React component test harness, so every task in this
plan is verified by `npm run lint` + `npm run build` (+ a manual check),
consistent with the rest of the component layer.

- [ ] **Step 1: Add `max-w-3xl` to the card**

In `app/(app)/projects/[projectId]/log/TableLogger.tsx`, the component's
returned JSX opens with:

```tsx
  return (
    <Card tone={isFinished ? "success" : "default"} className={`p-3 ${openFraction ? "z-20" : ""}`}>
```

Change the `Card`'s `className` to add `max-w-3xl`:

```tsx
  return (
    <Card tone={isFinished ? "success" : "default"} className={`max-w-3xl p-3 ${openFraction ? "z-20" : ""}`}>
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings. (A pre-existing `Date.now` error in
`TableLogger.tsx` around line 397 is unrelated — ignore it.)

- [ ] **Step 3: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/projects/[projectId]/log/TableLogger.tsx"
git commit -m "feat: cap table card width at max-w-3xl"
```

---

### Task 2: Extract `SectionTables` and refactor `ProjectLogView`

Move the per-section table-card rendering out of `ProjectLogView` into a new
`SectionTables` component, so the new section page (Task 3) can reuse it. The
log page and dashboard output must stay identical.

**Files:**
- Create: `components/portal/SectionTables.tsx`
- Modify: `components/portal/ProjectLogView.tsx`

- [ ] **Step 1: Create `components/portal/SectionTables.tsx`**

Create the file with this exact content:

```tsx
import { getTranslations } from "next-intl/server";
import { computeModules } from "@/lib/portal/modules";
import { TableLogger } from "@/app/(app)/projects/[projectId]/log/TableLogger";

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
}: {
  tables: Table[];
  assignedWorkers: { id: string; userId: string; name: string }[];
  allActiveWorkers: { id: string; name: string }[];
  projectWorkerId: string | null;
  isAdmin: boolean;
  isClosed: boolean;
}) {
  const t = await getTranslations("log");
  const tProj = await getTranslations("projects");

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
              done: t("done"),
            }}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Replace `components/portal/ProjectLogView.tsx` entirely**

Replace the whole file with this content (it now delegates table rendering to
`SectionTables` and imports the `Table` type from it):

```tsx
import { getTranslations } from "next-intl/server";
import { computeProgress } from "@/lib/portal/progress";
import { ProgressGraph } from "@/components/portal/ProgressGraph";
import { SectionTables, type Table } from "@/components/portal/SectionTables";

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
  const isClosed = project.status === "CLOSED";
  const projectProgress = computeProgress(
    project.sections.flatMap((s) => s.tables),
  );

  return (
    <>
      <ProgressGraph
        variant="project"
        tied={projectProgress.tied}
        connected={projectProgress.connected}
        total={projectProgress.total}
        labels={{
          heading: t("progressHeading"),
          tied: t("progressTied"),
          connected: t("progressConnected"),
        }}
      />
      {project.sections.length === 0 && (
        <p className="text-sm text-muted">No sections yet.</p>
      )}
      {project.sections.map((s) => {
        const sectionProgress = computeProgress(s.tables);
        return (
          <section key={s.id} className="mb-6">
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-navy/60">
                {s.name}
              </h3>
              <div className="w-full max-w-[16rem]">
                <ProgressGraph
                  variant="section"
                  tied={sectionProgress.tied}
                  connected={sectionProgress.connected}
                  total={sectionProgress.total}
                />
              </div>
            </div>
            <SectionTables
              tables={s.tables}
              assignedWorkers={assignedWorkers}
              allActiveWorkers={allActiveWorkers}
              projectWorkerId={projectWorkerId}
              isAdmin={isAdmin}
              isClosed={isClosed}
            />
          </section>
        );
      })}
    </>
  );
}
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings.

- [ ] **Step 4: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds — confirms `SectionTables`'s exported `Table` type and
all props line up.

- [ ] **Step 5: Verify the full test suite still passes**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 6: Manual check**

Run `npm run dev`, open a project log page (`/projects/<id>/log`) and the
dashboard. Confirm both still render every section with its table cards exactly
as before this task — the refactor is output-neutral.

- [ ] **Step 7: Commit**

```bash
git add components/portal/SectionTables.tsx components/portal/ProjectLogView.tsx
git commit -m "refactor: extract SectionTables from ProjectLogView"
```

---

### Task 3: Add the section page route

A new route showing one section's table cards, reachable directly by URL. The
project overview page links to it in Task 4.

**Files:**
- Create: `app/(app)/projects/[projectId]/sections/[sectionId]/page.tsx`

- [ ] **Step 1: Create the section page**

Create `app/(app)/projects/[projectId]/sections/[sectionId]/page.tsx` with this
exact content:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { ProgressGraph } from "@/components/portal/ProgressGraph";
import { SectionTables } from "@/components/portal/SectionTables";
import { computeProgress } from "@/lib/portal/progress";
import { getTableAggregates, getMyLogs } from "@/lib/portal/activity-aggregates";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ projectId: string; sectionId: string }>;
}) {
  const user = await requireUser();
  const { projectId, sectionId } = await params;

  const [project, allActiveWorkers] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: {
          where: { id: sectionId },
          include: {
            tables: {
              orderBy: { orderIndex: "asc" },
              include: {
                claims: { include: { projectWorker: { include: { user: true } } } },
              },
            },
          },
        },
        projectWorkers: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!project) notFound();

  const myPw = project.projectWorkers.find((pw) => pw.userId === user.id) ?? null;
  if (user.role !== "ADMIN" && !myPw) notFound();

  const section = project.sections[0];
  if (!section) notFound();

  const tableIds = section.tables.map((tbl) => tbl.id);
  const myPwIds = myPw ? [myPw.id] : [];
  const [aggregates, myLogsMap] = await Promise.all([
    getTableAggregates(tableIds),
    getMyLogs(tableIds, myPwIds),
  ]);

  const tables = section.tables.map((tbl) => {
    const agg = aggregates.get(tbl.id) ?? { totalTied: 0, totalConnected: 0 };
    const logEntry = myLogsMap.get(tbl.id) ?? { logs: [], hasActivity: false };
    return {
      ...tbl,
      totalTied: agg.totalTied,
      totalConnected: agg.totalConnected,
      myLogs: logEntry.logs,
      hasMyActivity: logEntry.hasActivity,
    };
  });

  const progress = computeProgress(tables);

  return (
    <div>
      <Link
        href={`/projects/${project.id}`}
        className="text-sm text-accent hover:underline"
      >
        ‹ {project.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-navy">{section.name}</h1>
      <div className="mt-3 mb-8 w-full max-w-[16rem]">
        <ProgressGraph
          variant="section"
          tied={progress.tied}
          connected={progress.connected}
          total={progress.total}
        />
      </div>
      {tables.length === 0 ? (
        <p className="text-sm text-muted">No tables yet.</p>
      ) : (
        <SectionTables
          tables={tables}
          assignedWorkers={project.projectWorkers.map((p) => ({
            id: p.id,
            userId: p.userId,
            name: p.user.name,
          }))}
          allActiveWorkers={allActiveWorkers}
          projectWorkerId={myPw?.id ?? null}
          isAdmin={user.role === "ADMIN"}
          isClosed={project.status === "CLOSED"}
        />
      )}
    </div>
  );
}
```

Notes: the nested `sections: { where: { id: sectionId } }` returns the section
only when it belongs to this project, so an unknown or mismatched `sectionId`
yields an empty `project.sections` and a 404. The enriched `tables` array
matches `SectionTables`'s exported `Table` type (the extra Prisma fields are
harmless under structural typing).

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings.

- [ ] **Step 3: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds — the new route appears in the route list.

- [ ] **Step 4: Manual check**

Run `npm run dev`. Find a real `projectId` and one of its `sectionId`s (e.g.
from the dashboard or database), and open
`/projects/<projectId>/sections/<sectionId>` directly. Confirm: the back link,
section name, section progress bar, and that section's table cards render.
Open the same URL with a bogus `sectionId` and confirm it 404s.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/projects/[projectId]/sections/[sectionId]/page.tsx"
git commit -m "feat: add per-section page route"
```

---

### Task 4: Section list on the project overview page

Replace the overview page's full `ProjectLogView` with the project progress
block and a list of section rows that link to the section pages.

**Files:**
- Create: `components/portal/SectionList.tsx`
- Modify: `app/(app)/projects/[projectId]/page.tsx`

- [ ] **Step 1: Create `components/portal/SectionList.tsx`**

Create the file with this exact content:

```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProgressGraph } from "@/components/portal/ProgressGraph";

export type SectionSummary = {
  id: string;
  name: string;
  tied: number;
  connected: number;
  total: number;
};

/**
 * The section-row list for the project overview page. Each row links to that
 * section's page.
 */
export function SectionList({
  projectId,
  sections,
}: {
  projectId: string;
  sections: SectionSummary[];
}) {
  return (
    <div className="space-y-2">
      {sections.map((s) => (
        <Link
          key={s.id}
          href={`/projects/${projectId}/sections/${s.id}`}
          className="flex items-center gap-4 rounded-md border border-border-soft bg-surface px-4 py-3 hover:border-navy/40"
        >
          <span className="w-32 shrink-0 text-sm font-semibold text-navy">
            {s.name}
          </span>
          <div className="min-w-0 flex-1">
            <ProgressGraph
              variant="section"
              tied={s.tied}
              connected={s.connected}
              total={s.total}
            />
          </div>
          <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace `app/(app)/projects/[projectId]/page.tsx` entirely**

Replace the whole file with this content:

```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { ProgressGraph } from "@/components/portal/ProgressGraph";
import { SectionList } from "@/components/portal/SectionList";
import { computeProgress } from "@/lib/portal/progress";
import { getTableAggregates } from "@/lib/portal/activity-aggregates";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const t = await getTranslations("log");
  const tCommon = await getTranslations("common");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: { tables: { orderBy: { orderIndex: "asc" } } },
      },
      projectWorkers: { select: { userId: true } },
    },
  });
  if (!project) notFound();

  // Workers can only view projects they're assigned to
  const isAssigned = project.projectWorkers.some((pw) => pw.userId === user.id);
  if (user.role !== "ADMIN" && !isAssigned) {
    notFound();
  }

  const tableIds = project.sections.flatMap((s) => s.tables.map((tbl) => tbl.id));
  const aggregates = await getTableAggregates(tableIds);

  const toProgressInput = (tbl: {
    rows: number;
    cols: number;
    skipped: number;
    id: string;
  }) => {
    const agg = aggregates.get(tbl.id) ?? { totalTied: 0, totalConnected: 0 };
    return {
      rows: tbl.rows,
      cols: tbl.cols,
      skipped: tbl.skipped,
      totalTied: agg.totalTied,
      totalConnected: agg.totalConnected,
    };
  };

  const sections = project.sections.map((s) => {
    const p = computeProgress(s.tables.map(toProgressInput));
    return { id: s.id, name: s.name, tied: p.tied, connected: p.connected, total: p.total };
  });

  const projectProgress = computeProgress(
    project.sections.flatMap((s) => s.tables).map(toProgressInput),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{project.name}</h1>
          {project.location && <p className="text-sm text-muted">{project.location}</p>}
        </div>
        <div className="flex gap-2">
          {user.role === "ADMIN" && (
            <Button href={`/projects/${project.id}/edit`} variant="secondary">{tCommon("edit")}</Button>
          )}
        </div>
      </div>

      <ProgressGraph
        variant="project"
        tied={projectProgress.tied}
        connected={projectProgress.connected}
        total={projectProgress.total}
        labels={{
          heading: t("progressHeading"),
          tied: t("progressTied"),
          connected: t("progressConnected"),
        }}
      />

      {sections.length === 0 ? (
        <p className="text-sm text-muted">No sections yet.</p>
      ) : (
        <SectionList projectId={project.id} sections={sections} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings.

- [ ] **Step 4: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Verify the full test suite still passes**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 6: Manual check**

Run `npm run dev`. Open a project (`/projects/<id>`). Confirm:
- The page shows the project progress block and a list of section rows (name,
  progress bars, `% · %`, chevron) — no table cards.
- Clicking a section row opens that section's page with its table cards; the
  "‹ {project name}" back link returns to the overview.
- The log page and dashboard are unchanged.
- Table cards (on the section page, log page, dashboard) are capped to
  `max-w-3xl`, not full width.

- [ ] **Step 7: Commit**

```bash
git add components/portal/SectionList.tsx "app/(app)/projects/[projectId]/page.tsx"
git commit -m "feat: section list on the project overview page"
```

---

## Self-Review Notes

- **Spec coverage:** Card width cap → Task 1. `SectionTables` extraction +
  `ProjectLogView` refactor → Task 2. New section page route + access control +
  404 on unknown `sectionId` → Task 3. `SectionList` + overview page rework →
  Task 4. Empty states: "No sections yet." (overview, Task 4; log page,
  Task 2), "No tables yet." (section page, Task 3). Log page / dashboard
  unchanged — confirmed in Task 2 Step 6 and Task 4 Step 6.
- **Placeholder scan:** No TBD/TODO; every code step shows complete file
  content or a complete edit.
- **Type consistency:** `SectionTables` exports `Table` (and `Claim`,
  `ActivityLog`); `ProjectLogView` (Task 2) imports `type Table` from it. Both
  `ProjectLogView` and the section page (Task 3) pass `SectionTables` the same
  prop shape (`tables`, `assignedWorkers`, `allActiveWorkers`,
  `projectWorkerId`, `isAdmin`, `isClosed`). `SectionList`'s `SectionSummary`
  (`id`, `name`, `tied`, `connected`, `total`) is exactly the object the
  overview page builds in Task 4 Step 2. `computeProgress` is called with
  `ProgressInput`-shaped objects (`rows`, `cols`, `skipped`, `totalTied`,
  `totalConnected`) at every call site.
- **Build-green ordering:** Task 1 is isolated. Task 2 creates `SectionTables`
  and switches `ProjectLogView` to it in the same task. Task 3's section page
  depends only on `SectionTables` (Task 2). Task 4's overview page links to the
  Task 3 route. Each task leaves the build green.
