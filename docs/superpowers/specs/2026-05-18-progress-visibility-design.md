# Progress Visibility Across Table, Section, and Project

**Date:** 2026-05-18
**Status:** Approved

## Problem

Completion progress is hard to read in the work portal:

- A table card ("log work" card) shows tied/connected only as a small text
  count tucked behind the expand toggle — no visual bar.
- The section + project progress block exists only on the project log page,
  so the project overview page and dashboard show no progress summary.
- The per-section bars have no percentage number.

A user cannot quickly see "what is done" at the table, section, or project
level.

## Goal

Make completion progress visible at every level, on every page that lists
tables:

1. A progress bar on every table card.
2. A percentage on every section.
3. The section + project progress block on every page with tables.

## What Changes

### 1. Per-table progress bar (every table card)

Each `TableLogger` card gains a progress block directly under its header row:
two full-width labelled bars — **Tied** and **Connected** — each with a
`count / total` readout (e.g. `78 / 100`).

- Bar fill width = `count / total`, clamped to 0–100%.
- Colours match the section/project graph: Tied = accent blue, Connected =
  darker blue.
- When the table is finished (`isTableFinished` — both counts at or over
  `total`), **both bar fills render green**, matching the card's existing
  green "success" tone and "Done" badge.
- The block is always visible on the card — not behind the expand toggle.

Because the block lives inside `TableLogger`, it appears automatically on
every page that renders table cards: the project log page, the project
overview page, and the dashboard.

**Expand toggle:** the toggle currently shows the tied/connected counts as
text (`78/100 tied · 54/100 connected`). Since the new bars show that, the
toggle drops the count text and reads **"Recent entries"** (it only expands
the recent-entries detail). The now-unused `log.tableProgress` message key is
removed.

### 2. Section completion percentage

The per-section bars in each section heading gain a percentage readout —
`78% · 54%` (tied · connected) — so each section's progress is a number, not
just a bar shape.

### 3. Section + project progress block on every page

The section + project progress block currently renders only on the log page,
gated by `ProjectLogView`'s `showProgress` prop. That gate is removed:
`ProjectLogView` always renders the block. It then appears on the project
overview page and dashboard as well, with no changes needed to those pages —
they already pass `ProjectLogView` the table data the block needs.

## How "what is done" reads at each level

- **Table:** the two bars (full and green at 100%) + green card + "Done" badge.
- **Section:** the `%` readout on the section bars.
- **Project:** the `%` readout in the project block.

## Components and Changes

### `lib/portal/progress.ts`

The percentage clamp currently lives in a private `pct(value, total)`
function. Export it as `toPercent(value: number, total: number): number` —
same behaviour (`total <= 0` → 0; otherwise `round(value / total * 100)`
clamped to 0–100). `computeProgress` keeps using it internally; `ProgressGraph`
will now use it too. `computeProgress`'s behaviour and return shape are
unchanged.

### `components/portal/ProgressGraph.tsx`

Today the component takes `tiedPct` / `connectedPct` and supports
`variant="project" | "section"`. It is reworked to take **raw counts** and
support a third variant:

- Props: `tied`, `connected`, `total`, `variant: "project" | "section" |
  "table"`, `done?: boolean`, `labels?: { heading?, tied, connected }`.
- It derives each bar's clamped percentage internally via `toPercent`.
- `variant="project"` — heading + two labelled full-width bars, `%` readout
  (unchanged appearance).
- `variant="section"` — two thin bars **plus a `%` readout** (the new
  requirement 2).
- `variant="table"` — two labelled full-width bars with a `count / total`
  readout; when `done` is `true`, both bar fills render green instead of blue.

The internal single-bar sub-component is reused across all three variants.

### `app/(app)/projects/[projectId]/log/TableLogger.tsx`

- Render `<ProgressGraph variant="table" tied={table.tied}
  connected={table.connected} total={table.total} done={isFinished}
  labels={{ tied, connected }} />` in a block directly under the card's
  header row. `isFinished` is already computed in the component.
- Change the expand toggle's content from `labels.progress` to `labels.recent`
  ("Recent entries").

### `components/portal/ProjectLogView.tsx`

- Remove the `showProgress` prop and its type; always compute project and
  per-section progress and render the block.
- Update the `ProgressGraph` calls (project and section) to pass `tied`,
  `connected`, `total` instead of `tiedPct` / `connectedPct`.
- In the `labels` object passed to `TableLogger`: add `progressTied:
  t("progressTied")` and `progressConnected: t("progressConnected")` for the
  table-bar labels; remove the now-unused `progress: t("tableProgress", …)`
  entry.

### `app/(app)/projects/[projectId]/log/page.tsx`

Remove the now-unused `showProgress` prop from the `ProjectLogView` element.
The project overview page (`app/(app)/projects/[projectId]/page.tsx`) and the
dashboard (`app/(app)/dashboard/page.tsx`) need no change — removing the gate
makes the block render there.

### `messages/en.json` and `messages/sk.json`

Remove the `log.tableProgress` key (no longer referenced). No new keys are
needed: the table-bar labels reuse the existing `log.progressTied` /
`log.progressConnected` keys, and the section `%` is plain numbers.

## Data Flow

```
page (log / overview / dashboard)
  → ProjectLogView
      computeProgress(all tables)       → ProgressGraph variant="project"
      computeProgress(section's tables) → ProgressGraph variant="section"
      per table {total,tied,connected}  → TableLogger
                                            → ProgressGraph variant="table"
```

No new database queries or server actions. Every page already supplies
`ProjectLogView` with each table's `rows`, `cols`, `skipped`, `totalTied`,
`totalConnected`.

## Error Handling / Edge Cases

- **Zero total modules** (`total = 0`): `toPercent` returns 0; bars render
  empty; the table readout shows `0 / 0`; the table is not "done".
- **Over-cap** (`count > total`): the bar fill clamps to 100%; the table
  readout still shows the actual logged count (e.g. `117 / 100`).
- **Project with no sections:** the existing "No sections yet." message still
  shows; the project block renders at `0%`.

## Testing

- `lib/portal/progress.test.ts`: add tests for the exported `toPercent`
  (partial value, zero total → 0, over-cap → clamped to 100). Existing
  `computeProgress` tests stay green (behaviour unchanged).
- `ProgressGraph`, `TableLogger`, and `ProjectLogView` are presentational /
  integration code; the project has no React component test harness, so they
  are verified by `npm run lint` and `npm run build`, consistent with the
  rest of the component layer.

## Out of Scope

- Turning a fully-completed section or project green (only table cards get the
  green treatment).
- A combined single "percent complete" metric — tied and connected stay
  separate everywhere.
- Historical or time-series progress.
- Changes to the dashboard's existing collapsed-state per-project count line.
