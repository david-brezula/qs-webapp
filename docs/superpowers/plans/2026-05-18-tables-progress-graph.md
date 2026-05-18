# Project Log Completion Progress Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a completion progress graph to the project log page — an overall project block with tied/connected bars at the top, plus a per-section breakdown.

**Architecture:** A pure vitest-tested helper (`lib/portal/progress.ts`) aggregates table counts into clamped percentages. A presentational `ProgressGraph` component renders the bars in a `"project"` or `"section"` variant. `ProjectLogView` computes the aggregates and renders the graph, gated by a new `showProgress` prop that only the log page sets — leaving the project overview page and dashboard unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, next-intl, vitest.

---

### Task 1: `computeProgress` helper

Aggregate a set of tables into total module capacity, summed tied/connected
counts, and clamped percentages. Pure function, vitest-tested, following the
`lib/portal/modules.ts` pattern.

**Files:**
- Create: `lib/portal/progress.ts`
- Test: `lib/portal/progress.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/portal/progress.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeProgress, type ProgressInput } from "./progress";

const table = (over: Partial<ProgressInput> = {}): ProgressInput => ({
  rows: 10,
  cols: 10,
  skipped: 0,
  totalTied: 0,
  totalConnected: 0,
  ...over,
});

describe("computeProgress", () => {
  it("sums total, tied and connected across tables", () => {
    const result = computeProgress([
      table({ rows: 10, cols: 10, skipped: 0, totalTied: 50, totalConnected: 20 }),
      table({ rows: 5, cols: 10, skipped: 0, totalTied: 10, totalConnected: 5 }),
    ]);
    expect(result.total).toBe(150);
    expect(result.tied).toBe(60);
    expect(result.connected).toBe(25);
  });

  it("computes percentages for a partially complete set", () => {
    const result = computeProgress([
      table({ rows: 10, cols: 10, skipped: 0, totalTied: 78, totalConnected: 54 }),
    ]);
    expect(result.tiedPct).toBe(78);
    expect(result.connectedPct).toBe(54);
  });

  it("returns all zeros for an empty array", () => {
    expect(computeProgress([])).toEqual({
      total: 0,
      tied: 0,
      connected: 0,
      tiedPct: 0,
      connectedPct: 0,
    });
  });

  it("yields 0% when total modules is zero (no divide-by-zero)", () => {
    const result = computeProgress([
      table({ rows: 0, cols: 0, skipped: 0, totalTied: 0, totalConnected: 0 }),
    ]);
    expect(result.total).toBe(0);
    expect(result.tiedPct).toBe(0);
    expect(result.connectedPct).toBe(0);
  });

  it("clamps percentages to 100 when counts exceed total (over-cap)", () => {
    const result = computeProgress([
      table({ rows: 10, cols: 10, skipped: 0, totalTied: 130, totalConnected: 100 }),
    ]);
    expect(result.tiedPct).toBe(100);
    expect(result.connectedPct).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- progress`
Expected: FAIL — `computeProgress` cannot be imported (file does not exist).

- [ ] **Step 3: Write minimal implementation**

Create `lib/portal/progress.ts`:

```ts
import { computeModules } from "./modules";

export interface ProgressInput {
  rows: number;
  cols: number;
  skipped: number;
  totalTied: number;
  totalConnected: number;
}

export interface Progress {
  total: number;
  tied: number;
  connected: number;
  tiedPct: number;
  connectedPct: number;
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

/**
 * Aggregate completion progress across a set of tables. `total` is the summed
 * module capacity; `tied` / `connected` are the summed logged counts.
 * Percentages are clamped to 0-100 so an over-cap table cannot render a bar
 * wider than full, and a table with no capacity cannot divide by zero.
 */
export function computeProgress(tables: ProgressInput[]): Progress {
  let total = 0;
  let tied = 0;
  let connected = 0;
  for (const t of tables) {
    total += computeModules({ rows: t.rows, cols: t.cols, skipped: t.skipped });
    tied += t.totalTied;
    connected += t.totalConnected;
  }
  return {
    total,
    tied,
    connected,
    tiedPct: pct(tied, total),
    connectedPct: pct(connected, total),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- progress`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/portal/progress.ts lib/portal/progress.test.ts
git commit -m "feat: add computeProgress aggregation helper"
```

---

### Task 2: `ProgressGraph` presentational component

A server component (no hooks, no events) that renders progress bars. It takes
percentages and a `variant` — never computes anything. There is no React
component test harness in this project (`@testing-library` is not installed),
so this task is verified by lint + build, consistent with the rest of the
component layer. Do NOT add a test file.

**Files:**
- Create: `components/portal/ProgressGraph.tsx`

- [ ] **Step 1: Create the component**

Create `components/portal/ProgressGraph.tsx`:

```tsx
type ProgressGraphLabels = {
  heading: string;
  tied: string;
  connected: string;
};

function ProgressBar({
  label,
  pct,
  fillClass,
}: {
  label?: string;
  pct: number;
  fillClass: string;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 text-slate-ink">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border-soft">
        <div
          className={`h-full rounded-full ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-semibold text-navy">
        {pct}%
      </span>
    </div>
  );
}

/**
 * Renders tied / connected completion bars. `variant="project"` shows a
 * headed block with two labelled full-width bars; `variant="section"` shows
 * two compact stacked bars with no heading or labels. Percentages are assumed
 * already clamped to 0-100 by the caller (see computeProgress).
 */
export function ProgressGraph({
  tiedPct,
  connectedPct,
  variant,
  labels,
}: {
  tiedPct: number;
  connectedPct: number;
  variant: "project" | "section";
  labels?: ProgressGraphLabels;
}) {
  if (variant === "section") {
    return (
      <div className="flex flex-col gap-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-border-soft">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${tiedPct}%` }}
          />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border-soft">
          <div
            className="h-full rounded-full bg-blue-900"
            style={{ width: `${connectedPct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-md border border-border-soft bg-surface p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/60">
        {labels?.heading}
      </p>
      <div className="space-y-2.5">
        <ProgressBar label={labels?.tied} pct={tiedPct} fillClass="bg-accent" />
        <ProgressBar
          label={labels?.connected}
          pct={connectedPct}
          fillClass="bg-blue-900"
        />
      </div>
    </div>
  );
}
```

Notes: `bg-accent`, `bg-border-soft`, `bg-surface`, `text-navy`, `text-slate-ink`,
and `border-border-soft` are existing project design-token classes used
throughout `components/portal`. `bg-blue-900` is a Tailwind built-in (the
darker blue chosen for "connected"). The component has no `"use client"`
directive — it has no interactivity and renders inside the `ProjectLogView`
server component.

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings for `components/portal/ProgressGraph.tsx`.

- [ ] **Step 3: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds (confirms the component's TypeScript types resolve).

- [ ] **Step 4: Commit**

```bash
git add components/portal/ProgressGraph.tsx
git commit -m "feat: add ProgressGraph presentational component"
```

---

### Task 3: Wire the graph into the project log page

Add the translation keys, then render `ProgressGraph` from `ProjectLogView`
gated behind a new `showProgress` prop that only the log page passes.

**Files:**
- Modify: `messages/en.json` (the `log` namespace)
- Modify: `messages/sk.json` (the `log` namespace)
- Modify: `components/portal/ProjectLogView.tsx`
- Modify: `app/(app)/projects/[projectId]/log/page.tsx`

- [ ] **Step 1: Add the progress keys to `messages/en.json`**

In `messages/en.json`, the `log` namespace currently ends with:

```json
    "notInProject": "not in project",
    "done": "Done"
  },
```

Change it to (add a comma after `"done"`, then three new keys):

```json
    "notInProject": "not in project",
    "done": "Done",
    "progressHeading": "Project progress",
    "progressTied": "Tied",
    "progressConnected": "Connected"
  },
```

- [ ] **Step 2: Add the progress keys to `messages/sk.json`**

In `messages/sk.json`, the `log` namespace currently ends with:

```json
    "notInProject": "nie je v projekte",
    "done": "Hotovo"
  },
```

Change it to:

```json
    "notInProject": "nie je v projekte",
    "done": "Hotovo",
    "progressHeading": "Priebeh projektu",
    "progressTied": "Uviazané",
    "progressConnected": "Zapojené"
  },
```

- [ ] **Step 3: Add imports to `components/portal/ProjectLogView.tsx`**

The file's import block currently is:

```tsx
import { getTranslations } from "next-intl/server";
import { computeModules } from "@/lib/portal/modules";
import { TableLogger } from "@/app/(app)/projects/[projectId]/log/TableLogger";
```

Change it to:

```tsx
import { getTranslations } from "next-intl/server";
import { computeModules } from "@/lib/portal/modules";
import { computeProgress } from "@/lib/portal/progress";
import { ProgressGraph } from "@/components/portal/ProgressGraph";
import { TableLogger } from "@/app/(app)/projects/[projectId]/log/TableLogger";
```

- [ ] **Step 4: Add the `showProgress` prop to `ProjectLogView`**

The component signature currently is:

```tsx
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
```

Change it to (add `showProgress = false,` to the destructuring and
`showProgress?: boolean;` to the type):

```tsx
export async function ProjectLogView({
  project,
  assignedWorkers,
  allActiveWorkers,
  projectWorkerId,
  isAdmin,
  showProgress = false,
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
  showProgress?: boolean;
}) {
```

- [ ] **Step 5: Compute project-level progress**

In `ProjectLogView`, the line after the signature currently is:

```tsx
  const t = await getTranslations("log");
  const tProj = await getTranslations("projects");
  const isClosed = project.status === "CLOSED";
```

Add a line immediately below `isClosed`:

```tsx
  const t = await getTranslations("log");
  const tProj = await getTranslations("projects");
  const isClosed = project.status === "CLOSED";
  const projectProgress = showProgress
    ? computeProgress(project.sections.flatMap((s) => s.tables))
    : null;
```

- [ ] **Step 6: Render the project-level graph**

The component's returned JSX currently begins:

```tsx
  return (
    <>
      {project.sections.length === 0 && (
        <p className="text-sm text-muted">No sections yet.</p>
      )}
```

Change it to insert the project graph before the sections check:

```tsx
  return (
    <>
      {projectProgress && (
        <ProgressGraph
          variant="project"
          tiedPct={projectProgress.tiedPct}
          connectedPct={projectProgress.connectedPct}
          labels={{
            heading: t("progressHeading"),
            tied: t("progressTied"),
            connected: t("progressConnected"),
          }}
        />
      )}
      {project.sections.length === 0 && (
        <p className="text-sm text-muted">No sections yet.</p>
      )}
```

- [ ] **Step 7: Convert the section map to a block body and add the section graph**

The section map currently begins:

```tsx
      {project.sections.map((s) => (
        <section key={s.id} className="mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-navy/60 mb-3">
            {s.name}
          </h3>
```

Change it to (convert the arrow body from `(` to `{ ... return ( `, compute
the section progress, and replace the bare `<h3>` with a flex row that also
holds the section graph):

```tsx
      {project.sections.map((s) => {
        const sectionProgress = computeProgress(s.tables);
        return (
        <section key={s.id} className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-navy/60">
              {s.name}
            </h3>
            {showProgress && (
              <div className="w-full max-w-[16rem]">
                <ProgressGraph
                  variant="section"
                  tiedPct={sectionProgress.tiedPct}
                  connectedPct={sectionProgress.connectedPct}
                />
              </div>
            )}
          </div>
```

- [ ] **Step 8: Close the section map block body**

The section map currently ends (this is the closing of the `.map` callback —
note the `))}` that closes the implicit-return parenthesis):

```tsx
        </section>
      ))}
    </>
  );
}
```

Change it to close the new block body instead (`)` for the `return (`, then
`}` for the arrow body, then `}` for `.map`):

```tsx
        </section>
        );
      })}
    </>
  );
}
```

- [ ] **Step 9: Pass `showProgress` from the log page**

In `app/(app)/projects/[projectId]/log/page.tsx`, the `ProjectLogView` element
currently is:

```tsx
      <ProjectLogView
        project={{
          id: project.id,
          name: project.name,
          location: project.location,
          status: project.status,
          sections,
        }}
        assignedWorkers={project.projectWorkers.map((p) => ({
          id: p.id,
          userId: p.userId,
          name: p.user.name,
        }))}
        allActiveWorkers={allActiveWorkers}
        projectWorkerId={projectWorkerId}
        isAdmin={user.role === "ADMIN"}
      />
```

Change it to add `showProgress` before the closing `/>`:

```tsx
      <ProjectLogView
        project={{
          id: project.id,
          name: project.name,
          location: project.location,
          status: project.status,
          sections,
        }}
        assignedWorkers={project.projectWorkers.map((p) => ({
          id: p.id,
          userId: p.userId,
          name: p.user.name,
        }))}
        allActiveWorkers={allActiveWorkers}
        projectWorkerId={projectWorkerId}
        isAdmin={user.role === "ADMIN"}
        showProgress
      />
```

- [ ] **Step 10: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings. (A pre-existing `Date.now` error in
`TableLogger.tsx` around line 382 is unrelated to this change — ignore it.)

- [ ] **Step 11: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds — confirms the next-intl keys and TypeScript types
resolve.

- [ ] **Step 12: Verify the full test suite still passes**

Run: `npm test`
Expected: PASS — all suites including `progress` are green.

- [ ] **Step 13: Manual visual check**

Run `npm run dev`, open a project's log page at `/projects/<id>/log` that has
at least one section with tables. Confirm:
- A "Project progress" block appears at the top with two labelled bars (Tied,
  Connected) showing percentages.
- Each section heading row shows two thin paired bars next to the section name.
- The project overview page (`/projects/<id>`) and the dashboard show NO
  progress graph — they are unchanged.

- [ ] **Step 14: Commit**

```bash
git add messages/en.json messages/sk.json components/portal/ProjectLogView.tsx "app/(app)/projects/[projectId]/log/page.tsx"
git commit -m "feat: show completion progress graph on project log page"
```

---

## Self-Review Notes

- **Spec coverage:** `computeProgress` helper + percentage formula + clamping +
  zero-total guard → Task 1. `ProgressGraph` with `project` / `section`
  variants → Task 2. `lib/portal/progress.ts`, `components/portal/ProgressGraph.tsx`,
  `ProjectLogView` `showProgress` prop, project + per-section rendering,
  `log/page.tsx` wiring, `en`/`sk` keys → Task 3. Scope restriction (log page
  only; overview + dashboard unchanged) → `showProgress` defaults to `false`,
  set `true` only in Task 3 Step 9; verified in Step 13. Edge cases (zero
  total, empty array, over-cap) → Task 1 tests.
- **Placeholder scan:** No TBD/TODO; every code step shows complete code.
- **Type consistency:** `ProgressInput` (`rows`, `cols`, `skipped`,
  `totalTied`, `totalConnected`) and `Progress` (`total`, `tied`, `connected`,
  `tiedPct`, `connectedPct`) defined in Task 1 are used unchanged in Task 3.
  `ProjectLogView`'s `Section.tables` elements carry exactly those five fields
  (plus extras), so they satisfy `ProgressInput[]`. `ProgressGraph`'s props
  (`tiedPct`, `connectedPct`, `variant`, `labels`) defined in Task 2 match
  every call site in Task 3 Steps 6 and 7.
