# Completion Progress Graph for the Project Log Page

**Date:** 2026-05-18
**Status:** Approved

## Problem

The project log page (`/projects/[projectId]/log`) lists tables grouped into
sections, each table tracking tied and connected counts. There is no at-a-glance
view of how complete the work is — a user must read every table's numbers to
gauge progress.

## Goal

Add a completion graph to the project log page: an overall project progress
block at the top, plus a per-section breakdown, both showing the tied and
connected percentages.

## Scope

The graph appears **only on the project log page** (`/projects/[projectId]/log`).

`ProjectLogView` is shared by three pages — the project log page, the project
overview page (`/projects/[projectId]`), and the dashboard. To keep the graph
on the log page only, `ProjectLogView` gains a `showProgress?: boolean` prop
that defaults to `false`. Only `LogPage` passes `showProgress={true}`. The
project overview page and dashboard render exactly as they do today.

## What It Shows

### Project progress block (top of the log page's table list)

A block with a small uppercase heading ("Project progress") and two labelled
horizontal bars:

- `Tied` — filled to the project's tied percentage, with the percentage shown.
- `Connected` — filled to the project's connected percentage, with the
  percentage shown.

### Per-section breakdown

Each section heading row gains two thin paired bars (tied above, connected
below) showing that section's percentages. No numbers on the section bars —
they are a compact comparison aid.

### Percentages

For a set of tables:

- `total` = sum of `computeModules({ rows, cols, skipped })` over the tables.
- `tied` = sum of each table's `totalTied`.
- `connected` = sum of each table's `totalConnected`.
- `tiedPct` = `total === 0 ? 0 : clamp(round(tied / total * 100), 0, 100)`.
- `connectedPct` = `total === 0 ? 0 : clamp(round(connected / total * 100), 0, 100)`.

Percentages clamp to 0–100 so an over-cap table (where a count exceeds `total`)
cannot render a bar wider than full or a number above 100%.

The project block uses every table in the project. Each section's bars use only
that section's tables.

## Components and Changes

### 1. `lib/portal/progress.ts` (new)

A pure, vitest-tested helper following the `lib/portal/modules.ts` pattern.

```ts
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

export function computeProgress(tables: ProgressInput[]): Progress;
```

`computeProgress` sums `computeModules` (imported from `./modules`) over the
tables for `total`, sums `totalTied` / `totalConnected`, and derives the clamped
percentages per the formula above. An empty array yields all-zero output.

### 2. `components/portal/ProgressGraph.tsx` (new)

A presentational component. No data logic — it receives percentages and renders
bars.

```ts
ProgressGraph({
  tiedPct,
  connectedPct,
  variant,        // "project" | "section"
  labels,         // { heading, tied, connected } — used by "project" variant
}): JSX.Element
```

- `variant="project"` — the uppercase heading, then two full-width labelled bars
  with the percentage shown at the end of each.
- `variant="section"` — two thin stacked bars only, no heading, no labels, no
  numbers.

Bar fill widths are set from the (already clamped) percentages. Styling uses
Tailwind classes consistent with the portal (tied = `bg-accent` / blue,
connected = a darker blue; neutral track). The `labels` prop is required so the
component stays free of `next-intl` coupling, matching how `TableLogger`
receives a `labels` object.

### 3. `components/portal/ProjectLogView.tsx` (modify)

- Add `showProgress?: boolean` to the props (default `false`).
- When `showProgress` is `true`:
  - Before the sections list, compute project progress with `computeProgress`
    over every table in every section, and render
    `<ProgressGraph variant="project" ... />`.
  - In each section's heading row, compute that section's progress and render
    `<ProgressGraph variant="section" ... />` alongside the `<h3>` section name.
- When `showProgress` is `false` (default), render exactly as today — no graph.
- The `total` per table is already computed inside `ProjectLogView` for
  `TableLogger`; reuse `rows/cols/skipped` (passed through to `computeProgress`)
  rather than recomputing inconsistently.
- Pass the `next-intl` labels for the graph (`heading`, `tied`, `connected`)
  into `ProgressGraph`. `ProjectLogView` already calls `getTranslations`.

### 4. `app/(app)/projects/[projectId]/log/page.tsx` (modify)

Pass `showProgress={true}` to `ProjectLogView`. No other change — the page
already builds `sections` with the table fields the helper needs.

### 5. `messages/en.json` and `messages/sk.json` (modify)

Add to the `log` namespace:

- `en.json`: `"progressHeading": "Project progress"`, `"progressTied": "Tied"`,
  `"progressConnected": "Connected"`.
- `sk.json`: Slovak equivalents — `"progressHeading": "Priebeh projektu"`,
  `"progressTied": "Uviazané"`, `"progressConnected": "Zapojené"`.

(`log` already has `tableProgress` using "tied"/"connected" inline; these new
standalone keys are for the graph's heading and bar labels.)

## Data Flow

```
log/page.tsx  (showProgress={true})
  → ProjectLogView
      computeProgress(all tables)        → ProgressGraph variant="project"
      computeProgress(section's tables)  → ProgressGraph variant="section" (per section)
```

No new database queries or server actions. `rows`, `cols`, `skipped`,
`totalTied`, and `totalConnected` already reach `ProjectLogView` for every
table.

## Error Handling / Edge Cases

- **Zero total modules** (project or section): percentages resolve to 0; bars
  render empty; no divide-by-zero.
- **Project with no sections:** the existing "No sections yet." message still
  shows; the project block renders at 0% / 0%.
- **Over-cap counts** (`tied > total`): clamped to 100%.
- **Other pages** (`/projects/[projectId]`, dashboard): `showProgress` is unset,
  so they are visually unchanged.

## Testing

`lib/portal/progress.test.ts` (vitest), covering `computeProgress`:

- Sums `total`, `tied`, `connected` across multiple tables.
- Computes correct clamped percentages for a partially complete set.
- Empty array → all-zero result.
- Zero total modules → 0% (no divide-by-zero).
- Over-cap counts → percentage clamped to 100.

`ProgressGraph` and `ProjectLogView` are presentational; the project has no
React component test harness, so they are verified by `npm run lint` and
`npm run build`, consistent with the rest of the component layer.

## Out of Scope

- Showing the graph on the project overview page or dashboard.
- A combined single "percent complete" metric (tied and connected stay
  separate).
- Historical or time-series progress (the graph is a current snapshot).
- Per-table progress bars (a finished table already shows a green card and
  "Done" badge from prior work).
