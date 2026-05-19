# Log Page Section Drill-Down

**Date:** 2026-05-19
**Status:** Approved

> This is **sub-project 1 of 2**. The user asked to apply the section
> drill-down to both the log page and the edit page; those are independent and
> are handled as separate spec → plan → implement cycles. This spec covers the
> **log page** only. The edit page is a later, separate cycle.

## Problem

The project log page (`/projects/[projectId]/log`) renders `ProjectLogView` —
the project progress block followed by every section with all of its table
cards. The project overview page was already converted to a two-level
drill-down (a section list, each row opening a per-section page). The log page
still shows the long, flat list.

## Goal

Make the log page a section drill-down, matching the overview page: show the
project progress block and a list of section rows, each linking to that
section's page.

## Approach

The section pages already exist at `/projects/[projectId]/sections/[sectionId]`
(they render the table cards, which include the work-logging forms). The log
page's section rows link to those existing pages — **no new routes**. The log
page becomes a second entry point into the same drill-down as the overview.

## Avoiding Duplication

The overview page (`app/(app)/projects/[projectId]/page.tsx`) currently does,
inline: fetch the table aggregates, compute per-section and project progress,
and render `<ProgressGraph variant="project">` + `<SectionList>`. Rather than
copy that into the log page, this logic is extracted into one shared component
that both pages render.

## Components

### `components/portal/ProjectSectionList.tsx` (new)

An async server component.

- Props: `projectId: string` and `sections` — each section
  `{ id, name, tables: { id, rows, cols, skipped }[] }`.
- Calls `getTableAggregates` over every table id to get `totalTied` /
  `totalConnected` per table.
- Computes each section's progress with `computeProgress`, and the project
  total as the sum of the section totals.
- Renders `<ProgressGraph variant="project">` (with the `log` namespace
  heading/labels) followed by either `<SectionList>` or, when there are no
  sections, the "No sections yet." message.

### `app/(app)/projects/[projectId]/page.tsx` (modified)

Refactored to delegate to `ProjectSectionList`: it fetches the project (with
sections and their tables) for the access check and page heading, renders the
heading (name, location, admin "Edit" button), then renders
`<ProjectSectionList projectId={project.id} sections={project.sections} />`.
Its rendered output is unchanged.

### `app/(app)/projects/[projectId]/log/page.tsx` (modified)

Reworked the same way: fetch the project (sections + tables) for the access
check and heading, render the existing "Log work" heading, then render
`<ProjectSectionList …>`. It no longer renders `ProjectLogView` and no longer
fetches table claims, the current user's logs, or the active-worker list — the
section list does not need them.

### `components/portal/ProjectLogView.tsx` (unchanged)

Still used by the dashboard, which is not part of this change.

## Data Flow and Access Control

No new database queries or server actions. `getTableAggregates` and
`computeProgress` already exist; `SectionList` and `ProgressGraph` already
exist.

Both pages keep the current access rule: `requireUser()`, then 404 unless the
user is an admin or a worker assigned to the project.

## Error Handling / Edge Cases

- **Project with no sections:** `ProjectSectionList` shows the project progress
  block (at 0%) and the "No sections yet." message — same as the overview page.
- **Unknown `projectId`:** the page 404s (unchanged).

## Testing

`ProjectSectionList` and the two pages are presentational / integration code,
and the project has no React component test harness, so this is verified by
`npm run lint`, `npm run build`, and a manual check:

- The log page shows the project progress block and a section list (no table
  cards); clicking a section row opens its section page.
- The project overview page is visually unchanged.
- The dashboard is unchanged.

The existing vitest suites stay green.

## Out of Scope

- The edit page drill-down (sub-project 2 — a separate cycle).
- Any change to the dashboard or to `ProjectLogView`.
- Any change to the section pages themselves.
