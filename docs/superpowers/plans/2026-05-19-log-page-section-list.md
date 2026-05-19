# Log Page Section Drill-Down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the project log page a section-list drill-down (matching the overview page), with each section row linking to the existing section page.

**Architecture:** Extract the overview page's inline "fetch aggregates → compute progress → render the project progress block + section list" logic into a shared `ProjectSectionList` component. Refactor the overview page to use it (output-neutral), then rework the log page to use it instead of `ProjectLogView`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma, next-intl.

This is sub-project 1 of 2 (the edit-page drill-down is a separate cycle).

---

### Task 1: Create `ProjectSectionList` and refactor the overview page

Extract the overview page's progress-block + section-list logic into a shared
component, and switch the overview page to it. This is output-neutral — the
overview page must render exactly as before.

`ProjectSectionList` and the pages are presentational / integration code and
the project has no React component test harness, so both tasks here are
verified by `npm run lint` + `npm run build` (+ the existing test suite),
consistent with the rest of the component layer.

**Files:**
- Create: `components/portal/ProjectSectionList.tsx`
- Modify: `app/(app)/projects/[projectId]/page.tsx`

- [ ] **Step 1: Create `components/portal/ProjectSectionList.tsx`**

Create the file with this exact content:

```tsx
import { getTranslations } from "next-intl/server";
import { ProgressGraph } from "@/components/portal/ProgressGraph";
import { SectionList } from "@/components/portal/SectionList";
import { computeProgress } from "@/lib/portal/progress";
import { getTableAggregates } from "@/lib/portal/activity-aggregates";

type SectionInput = {
  id: string;
  name: string;
  tables: { id: string; rows: number; cols: number; skipped: number }[];
};

/**
 * Fetches table aggregates, computes per-section and project progress, and
 * renders the project progress block plus the section list. Shared by the
 * project overview page and the log page.
 */
export async function ProjectSectionList({
  projectId,
  sections,
}: {
  projectId: string;
  sections: SectionInput[];
}) {
  const t = await getTranslations("log");

  const tableIds = sections.flatMap((s) => s.tables.map((tbl) => tbl.id));
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

  const sectionSummaries = sections.map((s) => {
    const p = computeProgress(s.tables.map(toProgressInput));
    return {
      id: s.id,
      name: s.name,
      tied: p.tied,
      connected: p.connected,
      total: p.total,
    };
  });

  const projectProgress = {
    tied: sectionSummaries.reduce((sum, s) => sum + s.tied, 0),
    connected: sectionSummaries.reduce((sum, s) => sum + s.connected, 0),
    total: sectionSummaries.reduce((sum, s) => sum + s.total, 0),
  };

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
      {sectionSummaries.length === 0 ? (
        <p className="text-sm text-muted">No sections yet.</p>
      ) : (
        <SectionList projectId={projectId} sections={sectionSummaries} />
      )}
    </>
  );
}
```

- [ ] **Step 2: Replace `app/(app)/projects/[projectId]/page.tsx` entirely**

Replace the whole file with this content (the aggregate fetch, progress
computation, `ProgressGraph`, and `SectionList` now live in
`ProjectSectionList`):

```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { ProjectSectionList } from "@/components/portal/ProjectSectionList";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
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

      <ProjectSectionList projectId={project.id} sections={project.sections} />
    </div>
  );
}
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings. (A pre-existing `Date.now` error in
`TableLogger.tsx` is unrelated — ignore it.)

- [ ] **Step 4: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Verify the full test suite still passes**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 6: Manual check**

Run `npm run dev` and open a project (`/projects/<id>`). Confirm it renders
exactly as before — project header, the project progress block, and the
section list — and that clicking a section row still opens its section page.

- [ ] **Step 7: Commit**

```bash
git add components/portal/ProjectSectionList.tsx "app/(app)/projects/[projectId]/page.tsx"
git commit -m "refactor: extract ProjectSectionList from the overview page"
```

---

### Task 2: Rework the log page as a section list

Switch the log page from `ProjectLogView` (every section's table cards) to
`ProjectSectionList` (the section drill-down).

**Files:**
- Modify: `app/(app)/projects/[projectId]/log/page.tsx`

- [ ] **Step 1: Replace `app/(app)/projects/[projectId]/log/page.tsx` entirely**

Replace the whole file with this content:

```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { ProjectSectionList } from "@/components/portal/ProjectSectionList";

export default async function LogPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const t = await getTranslations("log");

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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-1">{project.name}</h1>
      <p className="text-sm text-muted mb-8">{t("title")}</p>

      <ProjectSectionList projectId={project.id} sections={project.sections} />
    </div>
  );
}
```

Note: the log page no longer renders `ProjectLogView` and no longer fetches
table claims, the current user's logs (`getMyLogs`), or the active-worker list
— the section list does not need them. `ProjectLogView` itself is untouched
(the dashboard still uses it).

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings (the pre-existing `Date.now` error in
`TableLogger.tsx` is expected — ignore it).

- [ ] **Step 3: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Verify the full test suite still passes**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 5: Manual check**

Run `npm run dev` and open a project's log page (`/projects/<id>/log`).
Confirm:
- It shows the "Log work" heading, the project progress block, and a section
  list — no table cards.
- Clicking a section row opens that section's page
  (`/projects/<id>/sections/<sectionId>`).
- The project overview page and the dashboard are unchanged.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/projects/[projectId]/log/page.tsx"
git commit -m "feat: log page section drill-down"
```

---

## Self-Review Notes

- **Spec coverage:** `ProjectSectionList` shared component → Task 1 Step 1.
  Overview page refactored to use it (output-neutral) → Task 1 Step 2. Log page
  reworked to the section drill-down, dropping `ProjectLogView` and the unneeded
  data → Task 2. `ProjectLogView` unchanged (dashboard) → not touched by either
  task. Access control preserved → both replaced pages keep `requireUser` + the
  assigned-or-admin 404 check. Empty-state ("No sections yet.") → handled inside
  `ProjectSectionList`.
- **Placeholder scan:** No TBD/TODO; every code step gives complete file
  content.
- **Type consistency:** `ProjectSectionList`'s `SectionInput`
  (`{ id, name, tables: { id, rows, cols, skipped }[] }`) is satisfied by the
  Prisma `project.sections` result passed by both pages (the Prisma rows carry
  extra fields, which is allowed for a non-literal value). `ProjectSectionList`
  builds `sectionSummaries` as `{ id, name, tied, connected, total }` — exactly
  `SectionList`'s `SectionSummary` shape. `computeProgress` is called with
  `ProgressInput`-shaped objects.
- **Build-green ordering:** Task 1 creates `ProjectSectionList` and switches
  its first consumer (overview page) in the same task. Task 2's log page then
  depends on the already-created component. Each task leaves the build green.
