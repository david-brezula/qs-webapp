# Section Drill-Down on the Project View

**Date:** 2026-05-19
**Status:** Approved

## Problem

Clicking a project opens the project overview page (`/projects/[projectId]`),
which immediately renders every section with all of its table cards. For a
project with many sections and tables this is a long, dense page. There is no
way to look at the project's sections without also loading every table.

The table cards also stretch the full content width, which is wider than the
card's content needs.

## Goal

Make the project overview page a two-level drill-down:

1. Clicking a project shows the project progress block and a **list of its
   sections** — no table cards.
2. Clicking a section opens a **dedicated section page** showing only that
   section's table cards.

And cap the table card width so cards no longer stretch across the screen.

## Scope

- The drill-down restructures **only the project overview page**
  (`/projects/[projectId]`) and adds a new section page route.
- The **log page** (`/projects/[projectId]/log`) and the **dashboard** keep
  rendering every section with its tables via `ProjectLogView`, unchanged.
- The table-card width cap applies wherever the card renders (the new section
  page, the log page, the dashboard) — it is set on the card itself.

## Pages and Routes

### Project overview page — `/projects/[projectId]` (changed)

Renders, in order:

1. The project heading (name, location) and the admin "Edit" button — as today.
2. The project progress block — `<ProgressGraph variant="project" …>`.
3. A **section list**: one row per section. Each row shows the section name,
   the section's progress (`<ProgressGraph variant="section" …>`), a `% · %`
   readout, and a chevron. The whole row is a link to that section's page.

No table cards render on this page.

If the project has no sections, the existing "No sections yet." message shows
in place of the list.

### Section page — `/projects/[projectId]/sections/[sectionId]` (new route)

Renders, in order:

1. A back link to the project overview page, labelled "‹ {project name}".
2. The section name as the page heading, with the section's progress
   (`<ProgressGraph variant="section" …>`) beneath it.
3. That section's table cards.

If the section has no tables, an empty-state message shows.

## Components

To avoid duplicating the table-card rendering logic, two presentational
components are introduced and `ProjectLogView` is refactored to use one of them.

### `components/portal/SectionTables.tsx` (new)

An async server component that renders one section's table cards — the
`<div className="space-y-3">` of `<TableLogger>` elements currently inline in
`ProjectLogView`.

- Props: the section's `tables`, `assignedWorkers`, `allActiveWorkers`,
  `projectWorkerId`, `isAdmin`, `isClosed`.
- It calls `getTranslations` itself and builds the `labels` object passed to
  each `TableLogger` (moved out of `ProjectLogView`).
- It owns the `Table` / `Claim` / `ActivityLog` types for the table-card data
  shape.
- Renders nothing (or an empty-state message) when the section has no tables.

Used by both `ProjectLogView` (per section) and the new section page.

### `components/portal/SectionList.tsx` (new)

A presentational component rendering the section-row list for the overview
page.

- Props: `projectId` and `sections`, each section carrying `{ id, name, tied,
  connected, total }` (progress already aggregated by the page).
- Each row is a `next/link` to `/projects/[projectId]/sections/[section.id]`
  containing the section name, `<ProgressGraph variant="section" …>`, and a
  chevron, styled as a bordered row consistent with the portal.

### `components/portal/ProjectLogView.tsx` (modified)

Refactored to render each section's tables through `<SectionTables>` instead of
the inline table map. Its output on the log page and dashboard is unchanged —
project progress block, then per section a heading, section progress bar, and
the section's table cards.

### `app/(app)/projects/[projectId]/page.tsx` (modified)

Stops rendering `ProjectLogView`. Instead renders the project heading, the
project `<ProgressGraph variant="project" …>`, and `<SectionList>`. It computes
each section's progress with `computeProgress` and passes the
`{ id, name, tied, connected, total }` rows to `SectionList`.

### `app/(app)/projects/[projectId]/sections/[sectionId]/page.tsx` (new)

The section page. Fetches the project and the requested section, applies access
control, and renders the back link, section heading, section progress bar, and
`<SectionTables>`.

### `app/(app)/projects/[projectId]/log/TableLogger.tsx` (modified)

The card (`<Card>`) gains a `max-w-3xl` width cap so it no longer stretches the
full content width. The card stays left-aligned in its single-column list.

## Data Flow and Access Control

No new aggregate queries or server actions — the existing `computeProgress`,
`getTableAggregates`, and `getMyLogs` helpers cover everything.

**Project overview page:** fetches the project with its sections and tables
(`rows`, `cols`, `skipped`) and the project's workers; calls
`getTableAggregates` for each table's `totalTied` / `totalConnected`; computes
per-section progress. It no longer needs table claims, the active-worker list,
or the user's logs (no table cards render here).

**Section page:** fetches the project, locates the section by `sectionId`, and
loads that section's tables with claims, the project's workers, the active-user
list, `getTableAggregates`, and `getMyLogs` — the same data shapes the log page
already assembles, scoped to one section.

**Access control (both pages):** `requireUser()`, then 404 unless the user is
an admin or a worker assigned to the project — the rule the current overview
page already enforces. The section page additionally 404s when `sectionId` is
unknown or belongs to a different project.

## Error Handling / Edge Cases

- **Project with no sections:** overview page shows the project block and "No
  sections yet."; no section rows.
- **Section with no tables:** section page shows the heading and progress bar,
  then an empty-state message.
- **Unknown or mismatched `sectionId`:** the section page returns 404.
- **Closed project:** unchanged — `TableLogger` already handles the closed
  state; the section page passes `isClosed` through as before.

## Testing

`SectionList`, `SectionTables`, the two pages, and `ProjectLogView` are
presentational / integration code, and the project has no React component test
harness, so this is verified by `npm run lint`, `npm run build`, and a manual
check:

- Clicking a project shows the progress block and a section list, no tables.
- Clicking a section opens its page with that section's cards and a working
  back link.
- The log page and dashboard still show all sections and tables.
- Table cards are capped at `max-w-3xl` on every page.

The existing vitest suites (`progress`, `modules`, etc.) stay green —
`computeProgress` and the aggregate helpers are unchanged.

## Out of Scope

- Changes to the log page or dashboard layout.
- Collapsible/accordion sections (the chosen model is navigation to a section
  page).
- Any change to how progress is computed.
