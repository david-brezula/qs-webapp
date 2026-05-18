# Progress Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make completion progress visible at every level — a progress bar on every table card, a percentage on every section, and the section/project progress block on every page that lists tables.

**Architecture:** Export the existing percentage-clamp helper from `lib/portal/progress.ts`. Rework `ProgressGraph` to take raw counts and support a third `"table"` variant, adding a percentage readout to the `"section"` variant. Render the `"table"` variant inside every `TableLogger` card, and remove the `showProgress` gate so the section/project block renders on the log page, overview page, and dashboard alike.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, next-intl, vitest.

---

### Task 1: Export `toPercent` from `progress.ts`

The percentage-clamp logic is currently a private `pct` function in
`lib/portal/progress.ts`. `ProgressGraph` will need it directly. Export it as
`toPercent`, keep `computeProgress` using it, and add tests.

**Files:**
- Modify: `lib/portal/progress.ts`
- Test: `lib/portal/progress.test.ts`

- [ ] **Step 1: Write the failing test**

In `lib/portal/progress.test.ts`, change the import line:

```ts
import { computeProgress, type ProgressInput } from "./progress";
```

to:

```ts
import { computeProgress, toPercent, type ProgressInput } from "./progress";
```

Then append this `describe` block to the end of the file (after the closing
`});` of the existing `describe("computeProgress", ...)` block):

```ts
describe("toPercent", () => {
  it("rounds value / total to a whole percentage", () => {
    expect(toPercent(54, 100)).toBe(54);
    expect(toPercent(1, 3)).toBe(33);
  });

  it("returns 0 when total is zero or negative", () => {
    expect(toPercent(0, 0)).toBe(0);
    expect(toPercent(5, 0)).toBe(0);
  });

  it("clamps to 100 when value exceeds total", () => {
    expect(toPercent(130, 100)).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- progress`
Expected: FAIL — `toPercent` is not exported (import error).

- [ ] **Step 3: Rename `pct` to an exported `toPercent`**

In `lib/portal/progress.ts`, the helper currently is:

```ts
function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}
```

Change it to an exported function named `toPercent`:

```ts
/**
 * Convert a value/total pair to a whole-number percentage, clamped to 0-100.
 * A zero or negative total yields 0 (no divide-by-zero).
 */
export function toPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}
```

Then, in the same file, `computeProgress`'s return statement currently is:

```ts
  return {
    total,
    tied,
    connected,
    tiedPct: pct(tied, total),
    connectedPct: pct(connected, total),
  };
```

Change the two `pct(` calls to `toPercent(`:

```ts
  return {
    total,
    tied,
    connected,
    tiedPct: toPercent(tied, total),
    connectedPct: toPercent(connected, total),
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- progress`
Expected: PASS — all `computeProgress` tests plus the 3 new `toPercent` tests
are green.

- [ ] **Step 5: Commit**

```bash
git add lib/portal/progress.ts lib/portal/progress.test.ts
git commit -m "feat: export toPercent helper from progress"
```

---

### Task 2: Rework `ProgressGraph` and show the block on every page

Rework `ProgressGraph` to take raw counts, derive percentages internally, add
a `"table"` variant, and give the `"section"` variant a percentage readout.
Update `ProgressGraph`'s only current caller (`ProjectLogView`) to the new
props and remove the `showProgress` gate so the block renders everywhere. This
task changes `ProgressGraph` and both its existing call sites together, so the
build stays green.

`ProgressGraph`, `ProjectLogView`, and the log page are presentational /
integration code; the project has no React component test harness, so this
task is verified by lint + build.

**Files:**
- Modify: `components/portal/ProgressGraph.tsx`
- Modify: `components/portal/ProjectLogView.tsx`
- Modify: `app/(app)/projects/[projectId]/log/page.tsx`

- [ ] **Step 1: Replace `components/portal/ProgressGraph.tsx` entirely**

Replace the whole file with:

```tsx
import { toPercent } from "@/lib/portal/progress";

type ProgressGraphLabels = {
  heading?: string;
  tied: string;
  connected: string;
};

function ProgressBar({
  label,
  pct,
  readout,
  fillClass,
}: {
  label?: string;
  pct: number;
  readout: string;
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
      <span className="w-16 shrink-0 text-right font-semibold text-navy">
        {readout}
      </span>
    </div>
  );
}

/**
 * Renders tied / connected completion bars from raw counts.
 * - "project": headed block, two labelled bars, percentage readout.
 * - "section": two thin bars with a compact percentage readout.
 * - "table": two labelled bars with a `count / total` readout; bars render
 *   green when `done` is true.
 * Percentages are derived from the counts and clamped to 0-100.
 */
export function ProgressGraph({
  tied,
  connected,
  total,
  variant,
  done = false,
  labels,
}: {
  tied: number;
  connected: number;
  total: number;
  variant: "project" | "section" | "table";
  done?: boolean;
  labels?: ProgressGraphLabels;
}) {
  const tiedPct = toPercent(tied, total);
  const connectedPct = toPercent(connected, total);

  if (variant === "section") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col gap-1">
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
        <span className="shrink-0 text-xs font-semibold text-navy/70">
          {tiedPct}% · {connectedPct}%
        </span>
      </div>
    );
  }

  if (variant === "table") {
    const tiedFill = done ? "bg-emerald-500" : "bg-accent";
    const connectedFill = done ? "bg-emerald-500" : "bg-blue-900";
    return (
      <div className="space-y-1.5">
        <ProgressBar
          label={labels?.tied}
          pct={tiedPct}
          readout={`${tied} / ${total}`}
          fillClass={tiedFill}
        />
        <ProgressBar
          label={labels?.connected}
          pct={connectedPct}
          readout={`${connected} / ${total}`}
          fillClass={connectedFill}
        />
      </div>
    );
  }

  // variant === "project"
  return (
    <div className="mb-6 rounded-md border border-border-soft bg-surface p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/60">
        {labels?.heading}
      </p>
      <div className="space-y-2.5">
        <ProgressBar
          label={labels?.tied}
          pct={tiedPct}
          readout={`${tiedPct}%`}
          fillClass="bg-accent"
        />
        <ProgressBar
          label={labels?.connected}
          pct={connectedPct}
          readout={`${connectedPct}%`}
          fillClass="bg-blue-900"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Remove the `showProgress` prop from `ProjectLogView`**

In `components/portal/ProjectLogView.tsx`, the component signature currently
is:

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

Change it to (remove the `showProgress = false,` line and the
`showProgress?: boolean;` line):

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

- [ ] **Step 3: Make `projectProgress` unconditional**

In the same file, the `projectProgress` const currently is:

```tsx
  const projectProgress = showProgress
    ? computeProgress(project.sections.flatMap((s) => s.tables))
    : null;
```

Change it to:

```tsx
  const projectProgress = computeProgress(
    project.sections.flatMap((s) => s.tables),
  );
```

- [ ] **Step 4: Update the project-level `ProgressGraph` render**

In the same file, the project graph render currently is:

```tsx
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
```

Change it to (always rendered, raw-count props):

```tsx
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
```

- [ ] **Step 5: Update the per-section progress and `ProgressGraph` render**

In the same file, the start of the section map currently is:

```tsx
      {project.sections.map((s) => {
        const sectionProgress = showProgress ? computeProgress(s.tables) : null;
        return (
          <section key={s.id} className="mb-6">
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-navy/60">
                {s.name}
              </h3>
              {showProgress && sectionProgress && (
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

Change it to:

```tsx
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
```

- [ ] **Step 6: Drop the `showProgress` prop on the log page**

In `app/(app)/projects/[projectId]/log/page.tsx`, the `ProjectLogView` element
currently ends:

```tsx
        allActiveWorkers={allActiveWorkers}
        projectWorkerId={projectWorkerId}
        isAdmin={user.role === "ADMIN"}
        showProgress
      />
```

Change it to (remove the `showProgress` line):

```tsx
        allActiveWorkers={allActiveWorkers}
        projectWorkerId={projectWorkerId}
        isAdmin={user.role === "ADMIN"}
      />
```

- [ ] **Step 7: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings. (A pre-existing `Date.now` error in
`TableLogger.tsx` around line 382 is unrelated — ignore it.)

- [ ] **Step 8: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds — confirms the reworked `ProgressGraph` API and all
its call sites type-check.

- [ ] **Step 9: Commit**

```bash
git add components/portal/ProgressGraph.tsx components/portal/ProjectLogView.tsx "app/(app)/projects/[projectId]/log/page.tsx"
git commit -m "feat: count-based ProgressGraph, section %, block on every page"
```

---

### Task 3: Add the progress bar to every table card

Render the `"table"` variant of `ProgressGraph` inside every `TableLogger`
card, switch the expand toggle to read "Recent entries", thread the bar labels
through `ProjectLogView`, and remove the now-unused `log.tableProgress`
message key.

Verified by lint + build + the test suite.

**Files:**
- Modify: `app/(app)/projects/[projectId]/log/TableLogger.tsx`
- Modify: `components/portal/ProjectLogView.tsx`
- Modify: `messages/en.json`
- Modify: `messages/sk.json`

- [ ] **Step 1: Import `ProgressGraph` in `TableLogger`**

In `app/(app)/projects/[projectId]/log/TableLogger.tsx`, the import block ends
with:

```tsx
import { isTableFinished } from "@/lib/portal/table-status";
```

Add a line immediately below it:

```tsx
import { isTableFinished } from "@/lib/portal/table-status";
import { ProgressGraph } from "@/components/portal/ProgressGraph";
```

- [ ] **Step 2: Render the table progress bar under the header row**

In the same file, the card's header row closes and is followed by the error
line — currently:

```tsx
      </div>

      {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
```

Change it to insert the progress bar block between them:

```tsx
      </div>

      <div className="mt-3">
        <ProgressGraph
          variant="table"
          tied={table.tied}
          connected={table.connected}
          total={table.total}
          done={isFinished}
          labels={{
            tied: labels.progressTied,
            connected: labels.progressConnected,
          }}
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
```

(`table.tied`, `table.connected`, `table.total`, and `isFinished` are all
already in scope in this component.)

- [ ] **Step 3: Change the expand toggle text**

In the same file, the expand toggle button currently renders the progress
count text:

```tsx
          <ChevronRight
            size={14}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          {labels.progress}
        </button>
```

Change `{labels.progress}` to `{labels.recent}`:

```tsx
          <ChevronRight
            size={14}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          {labels.recent}
        </button>
```

- [ ] **Step 4: Update the labels passed to `TableLogger`**

In `components/portal/ProjectLogView.tsx`, the `labels` object passed to
`TableLogger` currently includes:

```tsx
                      submit: t("submit"),
                      progress: t("tableProgress", { tied, connected, total }),
                      recent: t("recentEntries"),
```

Change it to (replace the `progress` line with the two bar-label keys):

```tsx
                      submit: t("submit"),
                      progressTied: t("progressTied"),
                      progressConnected: t("progressConnected"),
                      recent: t("recentEntries"),
```

- [ ] **Step 5: Remove the `tableProgress` key from `messages/en.json`**

In `messages/en.json`, the `log` namespace currently contains:

```json
    "workDate": "Work date",
    "tableProgress": "{tied}/{total} tied · {connected}/{total} connected",
    "submit": "Add entry",
```

Delete the `tableProgress` line:

```json
    "workDate": "Work date",
    "submit": "Add entry",
```

- [ ] **Step 6: Remove the `tableProgress` key from `messages/sk.json`**

In `messages/sk.json`, the `log` namespace currently contains:

```json
    "workDate": "Dátum práce",
    "tableProgress": "{tied}/{total} uviazaných · {connected}/{total} zapojených",
    "submit": "Pridať záznam",
```

Delete the `tableProgress` line:

```json
    "workDate": "Dátum práce",
    "submit": "Pridať záznam",
```

- [ ] **Step 7: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings (the pre-existing `Date.now` error in
`TableLogger.tsx` is expected — ignore it).

- [ ] **Step 8: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds — confirms the `next-intl` keys resolve and types
check.

- [ ] **Step 9: Verify the full test suite still passes**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 10: Manual visual check**

Run `npm run dev` and confirm:
- On a project log page (`/projects/<id>/log`): every table card shows two
  labelled bars (Tied, Connected) with `count / total`; the section headings
  show bars with a `% · %` readout; the project block is at the top.
- On the project overview page (`/projects/<id>`) and the dashboard: the
  project block and per-section bars now also appear, and the table cards show
  the bars.
- A finished table's card is green, shows the "Done" badge, and its two bars
  are green and full.
- The expand toggle on a card reads "Recent entries".

- [ ] **Step 11: Commit**

```bash
git add "app/(app)/projects/[projectId]/log/TableLogger.tsx" components/portal/ProjectLogView.tsx messages/en.json messages/sk.json
git commit -m "feat: show a progress bar on every table card"
```

---

## Self-Review Notes

- **Spec coverage:** `toPercent` export → Task 1. `ProgressGraph` count-based
  props + `table` variant + section `%` → Task 2 Step 1. Section/project block
  on every page (remove `showProgress`) → Task 2 Steps 2-6. Per-table bar on
  every card + green-when-done → Task 3 Steps 1-2. Expand toggle → "Recent
  entries" → Task 3 Step 3. Bar labels threaded + `progress` label removed →
  Task 3 Step 4. `tableProgress` key removed → Task 3 Steps 5-6. Edge cases
  (zero total, over-cap) handled by `toPercent` (tested in Task 1) and the
  `count / total` readout.
- **Placeholder scan:** No TBD/TODO; every code step shows complete code.
- **Type consistency:** `toPercent(value, total)` defined in Task 1 is used in
  Task 2's `ProgressGraph`. `ProgressGraph` props (`tied`, `connected`,
  `total`, `variant`, `done?`, `labels?: { heading?, tied, connected }`)
  defined in Task 2 Step 1 match every call site: project (Task 2 Step 4) and
  section (Task 2 Step 5) pass `tied/connected/total`; table (Task 3 Step 2)
  passes `tied/connected/total/done/labels`. `labels.progressTied` /
  `labels.progressConnected` are added to `TableLogger`'s `labels` object in
  Task 3 Step 4 and consumed in Task 3 Step 2. The `labels` prop on
  `TableLogger` is typed `Record<string, string>`, so the new keys need no
  type change.
