# Strip Dates from Admin Wages Drill-Down

**Date:** 2026-05-20
**Status:** Approved

## Problem

The admin wages drill-down (`/wages`, `/wages/projects/[id]`,
`/wages/projects/[id]/sections/[sid]`) ships with a `from`/`to` filter, an
"all-time figures are primary" helper note, an Export CSV button on the top
page, and every numeric cell rendered as **two** numbers (all-time large,
range muted). In practice this duality adds noise without serving the admin's
actual question: how much each worker has earned across a project and per
section. The dates are surplus to requirements.

## Goal

Remove the date-range filter, the all-time/range dual display, the helper
text, and the Export CSV button from every admin wages page. Each numeric
cell becomes one number — the all-time total. The drill-down structure and
the column lists at each level stay exactly as they are. The worker `/wages`
view (`MyWagesView`) and the `/wages/export.csv` route handler are not
touched.

## Scope

- **In scope:** the three admin wages pages and their three presentational
  components, plus the deletion of the now-unused `WageDateFilter`. Two i18n
  keys removed.
- **Out of scope:** the worker `/wages` view, RLS, the `qs_worker` role, the
  `lib/portal/wages.ts` helpers (`computeWages`, `computeWagesByProject`,
  `sumWageRows`, `ALL_TIME_FROM`, `ALL_TIME_TO`) and their tests. All stay
  unchanged.

## What Each Admin Page Renders After This Change

### `/wages` (admin project list)

No filter bar. No helper text. No Export CSV button. One row per project,
sorted `Project.createdAt desc`. Columns:

- Project name (link to `/wages/projects/[id]`).
- Location.
- Status badge (active / closed).
- Tie, Connect, Accommodation, Wage — each one number (all-time).

The `mixedCurrencies` and `missing-price` warning banners surface at the top
when any project triggers them.

Project rows with zero activity ever still appear — admins can see at a
glance which projects have not produced wage data yet.

### `/wages/projects/[projectId]` (project page)

Back link to `/wages`. Header: project name + optional location. No filter
bar, no helper text.

Two stacked panels:

- **Sections** — one row per section. Columns: Section name (link to the
  section page), Tie, Connect, Earnings. All one number. Sections with no
  activity still appear (the spec's "structural rows always show" rule).
- **Per-worker summary for this project** — one row per worker who has any
  activity or accommodation on this project. Columns: Worker name, Tie,
  Connect, Earnings, Accommodation, Wage. All one number. Filter: hide rows
  where `earnings === 0 && accommodation === 0`.

Banners (`mixedCurrencies`, `missing-price`) surface where relevant.

### `/wages/projects/[projectId]/sections/[sectionId]` (section page)

Back link to the project page. Header: section name. No filter bar, no
helper text.

One row per worker with any activity in this section. Columns: Worker name,
Tie, Connect, Earnings. All one number. Filter: hide rows where
`earnings === 0`.

## Computation

The pages each issue ONE `computeWages` call per scope, with
`from = ALL_TIME_FROM`, `to = ALL_TIME_TO` (the already-exported constants).
The second per-scope call that previously computed the user-selected range
is removed entirely. No changes to `lib/portal/wages.ts`.

## URL Behaviour

All admin wages routes ignore `?from=` and `?to=` search params. Back-link
URLs no longer carry those parameters. If a user opens a stale URL with
`?from=…&to=…` (e.g., from browser history), the parameters are simply
ignored and the page renders the all-time view — no error, no redirect.

## Files Touched

**Modified**

- `app/(app)/wages/page.tsx` — admin branch: stop reading `from`/`to` from
  search params, do one `computeWages` per project, drop range fields from
  the constructed `ProjectRow` objects. Worker branch unchanged.
- `app/(app)/wages/AdminProjectList.tsx` — drop `from`/`to` props and the
  `WageDateFilter`/helper/Export CSV button; `NumCell` collapses to a single
  numeric prop.
- `app/(app)/wages/AdminProjectWageView.tsx` — drop `from`/`to` props, the
  filter, and the helper; `NumCell` collapses; section row link no longer
  carries `?from=&to=`.
- `app/(app)/wages/AdminSectionWageView.tsx` — drop `from`/`to` props, the
  filter, and the helper; `NumCell` collapses.
- `app/(app)/wages/projects/[projectId]/page.tsx` — drop searchParams + the
  ranged `computeWages` calls; back link no longer carries `?from=&to=`.
- `app/(app)/wages/projects/[projectId]/sections/[sectionId]/page.tsx` —
  same as above.
- `messages/en.json`, `messages/sk.json` — remove `wages.allTimeHelper` and
  `wages.exportCsv` keys (now unreferenced). Reword `wages.noData` from
  "No activity in this range." to "No activity yet." (and the Slovak
  equivalent), since "range" no longer exists in this UI.

**Removed**

- `app/(app)/wages/WageDateFilter.tsx` — no consumers after the changes
  above. The worker `MyWagesView` uses its own inline filter; this shared
  component was admin-only.

**Untouched**

- `lib/portal/wages.ts` and `lib/portal/wages.test.ts` — `computeWages`,
  `computeWagesByProject`, `sumWageRows`, `ALL_TIME_FROM`, `ALL_TIME_TO`
  remain exported and used (each page issues exactly one all-time call now).
- `app/(app)/wages/MyWagesView.tsx` — worker view keeps its date filter.
- `app/(app)/wages/export.csv/route.ts` — still works at the URL level; no
  UI link to it after the Export button is removed.
- `lib/prisma-worker.ts`, the RLS migrations, the `qs_worker` role.
- `proxy.ts` — already covers `/wages/...` paths.

## Error Handling / Edge Cases

- Unknown `projectId` or `sectionId` → 404 (`notFound()`), as today.
- Project with no sections → sections panel shows the "No sections yet."
  empty state, per-worker summary still renders.
- Stale `?from=&to=` query params in a bookmarked URL → ignored, page
  renders the all-time view.
- Mixed-currency accommodations within a project → banner still surfaces on
  the project list and project page; not on the section page (no
  accommodation there).
- Worker with accommodation but zero activity → still shown on the project
  page per-worker summary (filter is `earnings === 0 && accommodation === 0`).

## Performance Note

Removing the second `computeWages` call per scope **halves** the in-memory
wage scan work compared to the previous version. The project list still
issues one all-time `computeWages` per project against the full
`ActivityLog`; that cost is unchanged and the spec already accepts it for
current scale.

## Testing

- No new unit tests. The pure helpers do not change.
- Verification is `npm run lint` + `npm run build` + manual click-through
  (consistent with the existing admin wages spec).
- Reference for "no behaviour regression": `npm test` keeps passing (49/49)
  — the helper signatures and existing tests are untouched.
