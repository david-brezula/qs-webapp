# Admin Wages Drill-Down by Project and Section

**Date:** 2026-05-20
**Status:** Approved

## Problem

The admin `/wages` page currently renders a single flat per-worker table for a
`from`/`to` range — every worker's tie/connect/earnings/accommodation/wage,
aggregated across all their projects in that range. The admin cannot ask "what
did each worker earn on project X, section Y?" without leaving the page and
reading the project log. Section-level wage information is not exposed
anywhere.

## Goal

Replace the contents of the admin `/wages` page with a **project drill-down**
that breaks wages down by **project → section → worker**. Each level shows
**all-time totals as the primary figure**, with the existing `from`/`to`
filter producing a smaller "range total" rendered alongside.

The worker `/wages` view, the per-worker date-range CSV export, and the wage
RLS layer are all untouched.

## Scope

Three coordinated pages plus a small additive change to the pure wage helper:

- **A.** `/wages` (admin) — replace the flat per-worker table with a per-project
  list.
- **B.** `/wages/projects/[projectId]` — sections of the project + a per-worker
  summary for the project.
- **C.** `/wages/projects/[projectId]/sections/[sectionId]` — per-worker
  tie/connect/earnings for that section.
- **D.** Extend `lib/portal/wages.ts` with optional `sectionId` filtering so
  `computeWages` can scope earnings to one section without duplicating logic.

## Pages

### A. `/wages` (admin project list)

The page header keeps the existing `from`/`to` filter and the "Export CSV"
button (which still hits `/wages/export.csv` — the per-worker date-range CSV).

A short helper line above the table explains that **all-time figures are the
headline numbers** and the range total is shown alongside.

One row per project, sorted by `Project.createdAt desc` (same ordering as the
existing admin project list). Each row carries:

- **Project name** — link to `/wages/projects/[id]`.
- **Location**.
- **Status** badge (active / closed).
- **Tie** earnings — all-time primary, range secondary in muted text.
- **Connect** earnings — same pattern.
- **Accommodation** — all-time primary, range secondary.
- **Wage** (= earnings − accommodation) — all-time primary, range secondary.

Projects with no activity ever still appear with zeros — admins can see at a
glance which projects have not yet produced wage data.

### B. `/wages/projects/[projectId]` (project page)

Page header: project name (large), location, status badge.

Two stacked panels:

**Sections panel.** One row per section of the project. Columns: Section name
(link to its section page), Tie, Connect, Earnings. All-time primary + range
secondary on each numeric column. Sections with no activity still appear with
zeros. If the project has no sections at all, the panel shows the existing
"No sections yet." empty state used by the log drill-down.

**Per-worker summary panel.** One row per worker who has any activity on this
project (workers with strictly zero activity across all sections are
omitted — matches the existing admin view's behaviour). Columns: Worker name,
Tie, Connect, Earnings, Accommodation (project-level), Wage. All-time primary
+ range secondary.

### C. `/wages/projects/[projectId]/sections/[sectionId]` (section page)

Page header: section name, with a project breadcrumb back to the project
page.

One row per worker who has any activity in this section. Columns: Worker
name, Tie, Connect, Earnings. All-time primary + range secondary.

Accommodation and the final "Wage" column are deliberately omitted at the
section level — accommodation is a project-level concept and there is no
meaningful section-level allocation. Workers with strictly zero activity in
this section are omitted.

## Wage Computation

### D. Additive `sectionId` support in `lib/portal/wages.ts`

The existing `computeWages` function is extended in a backwards-compatible way:

1. `WageInput.activity[]` records gain an optional `sectionId: string` field.
2. `WageInput` gains an optional `sectionId?: string | null` filter that, when
   set, restricts activity to that section in the same place the existing
   `projectId` filter is applied.

Existing callers (the admin date-range CSV export, the worker `/wages` page
via `computeWagesByProject`) do not pass `sectionId` and observe no behaviour
change. The new admin pages pass `sectionId` for the section page's earnings
computation.

### All-time vs. range

"All-time" is computed by calling the existing function with a wide range
(`from = new Date(0)`, `to = new Date(9999, 0, 1)`). No new function or
signature change.

Each admin page server component issues exactly two computations per scope —
one all-time, one over the user-selected `from`/`to` range — and renders both
side by side.

### `WagesView` removal

The existing client component `app/(app)/wages/WagesView.tsx` is removed; the
new pages render their own focused presentational components. The
`wages/export.csv/route.ts` does its own computation and does not depend on
`WagesView`.

## Data Flow

Every admin wages page is a server component using the existing owner Prisma
client (`@/lib/prisma`) — RLS is bypassed by the owner, the policies do not
apply. The query shape on each page:

- **Project list:** load every `Project`, every `ProjectWorker`, every
  `ActivityLog` (with `projectWorker`, `table.section.projectId`,
  `table.section.id`), every `Accommodation` with its workers. Compute one
  all-time and one ranged total per project.
- **Project page:** scope queries to one `projectId`. Compute per-section
  totals (one all-time + one ranged `computeWages` call per section, with
  `sectionId` set) and one project-wide per-worker summary (one all-time +
  one ranged call without `sectionId`).
- **Section page:** scope queries to one `sectionId`. One all-time + one
  ranged `computeWages` call with `sectionId` set.

All access is admin-only — `requireAdmin()` at the top of each page server
component, and `proxy.ts`'s existing `adminOnlyPrefixes` already covers the
new `/wages/projects/...` URLs.

## Files Touched

**New**

- `app/(app)/wages/projects/[projectId]/page.tsx`
- `app/(app)/wages/projects/[projectId]/sections/[sectionId]/page.tsx`
- `app/(app)/wages/AdminProjectList.tsx`
- `app/(app)/wages/AdminProjectWageView.tsx`
- `app/(app)/wages/AdminSectionWageView.tsx`

**Modified**

- `lib/portal/wages.ts` — additive `sectionId` field and filter.
- `lib/portal/wages.test.ts` — tests for the new `sectionId` filter behaviour
  alongside the existing `computeWages` and `computeWagesByProject` tests.
- `app/(app)/wages/page.tsx` — admin branch renders `AdminProjectList`;
  worker branch unchanged.
- `messages/en.json`, `messages/sk.json` — keys for "All-time", "Range total"
  (and any new column / panel labels).

**Removed**

- `app/(app)/wages/WagesView.tsx` — superseded by the new admin
  presentational components.

## Error Handling / Edge Cases

- Unknown `projectId` or `sectionId` → 404 (`notFound()` matches the existing
  log drill-down).
- Project with no sections → project page renders the sections panel's empty
  state; the per-worker summary appears as usual (with zeros if there's no
  activity).
- Mixed-currency accommodations → the existing `mixedCurrencies` warning
  surfaces on the project list and on the project page (where accommodation
  is shown). It does not appear on the section page (no accommodation there).
- `from > to` in the URL — treated as "empty range"; range column shows
  zeros. (Matches today's behaviour.)

## Testing

- New unit tests in `lib/portal/wages.test.ts` for the optional `sectionId`
  filter: a single-project, multi-section fixture where activity is split
  across sections, asserting per-section earnings match expectations and the
  filter is inert when omitted.
- Existing `computeWages` and `computeWagesByProject` tests stay green.
- Page-level rendering is verified by `npm run build` plus a human manual
  click-through (consistent with the existing project-log drill-down spec's
  approach — no React test harness in the project).

## Performance Note

The project list computes all-time totals from the full `ActivityLog` table.
At current dev scale this is well under a second. If activity ever grows
large enough to make this slow, a SQL-side aggregation (a single grouped
query) is the obvious follow-up — explicitly out of scope here.

## Out of Scope

- Worker `/wages` view, RLS layer, `qs_worker` role, `lib/prisma-worker.ts` —
  all untouched.
- CSV export changes: `/wages/export.csv` remains the per-worker date-range
  CSV (the "info-extra" download path) without any structural change.
- Per-section accommodation allocation (accommodation stays project-level).
- SQL aggregation / caching for the project list.
