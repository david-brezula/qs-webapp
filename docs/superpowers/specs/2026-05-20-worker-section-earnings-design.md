# Worker Section Earnings — Inline Expand

**Date:** 2026-05-20  
**Status:** Approved

## Summary

Workers can already see their earnings broken down by project. This feature adds a section-level breakdown: clicking/tapping a project row expands it inline to reveal per-section earnings (tie, connect, earnings). Section data loads lazily on first expand and is cached in component state.

---

## Data Flow

1. Worker selects a date range and clicks "Calculate" — existing behaviour, unchanged.
2. The resulting project list renders with a chevron toggle on each row.
3. On first expand of a project row the client calls:
   ```
   GET /api/wages/projects/[projectId]/sections?from=YYYY-MM-DD&to=YYYY-MM-DD
   ```
4. The API handler authenticates via the existing session, resolves the worker's userId, and runs the query inside `withWorkerScope(userId)` for RLS enforcement.
5. A new utility function `computeWagesBySection` (added to `lib/portal/wages.ts`) groups activity logs by section for that worker + project + date range and returns:
   ```ts
   { sections: { sectionId: string; sectionName: string; tie: number; connect: number; earnings: number }[] }
   ```
6. The result is stored in a `Map<projectId, sections[]>` in `MyWagesView` state. Subsequent expand/collapse of the same project uses the cached value — no re-fetch.

---

## New Utility: `computeWagesBySection`

Added to `lib/portal/wages.ts`.

Input: `{ projectId, userId, from?, to?, projectWorkers, activityLogs, sections }`  
Logic: filter activity logs to the given project + worker + date range, group by `table.sectionId`, sum tie/connect counts × price, return one entry per section that has activity. Sections with zero activity are omitted.  
Output: `SectionWageRow[]` where each row has `{ sectionId, sectionName, tie, connect, earnings }`.

No accommodation column — accommodation is a project-level deduction already visible on the parent project row.

---

## New API Route

**File:** `app/(app)/wages/projects/[projectId]/sections/route.ts`

- Method: `GET`
- Auth: existing `getServerSession` + role check (worker or admin)
- Scope: `withWorkerScope(userId)` — RLS ensures worker sees only their own activity
- Query params: `from`, `to` (optional, same format used by the existing wages page)
- Delegates to `computeWagesBySection`
- Returns `{ sections: SectionWageRow[] }` as JSON

No new auth logic — mirrors the pattern of the existing worker wages data fetching in `app/(app)/wages/page.tsx`.

---

## UI Changes

### `MyWagesView.tsx`

- Add `expandedProjects: Set<string>` and `sectionCache: Map<string, SectionWageRow[]>` to component state.
- Add `loadingSections: Set<string>` to track in-flight fetches.
- When the worker clicks "Calculate" (date range changes and results reload), reset `expandedProjects`, `sectionCache`, and `loadingSections` so stale section data is never shown under a new date range's project rows.
- Each project row gains a chevron icon (▶ collapsed, ▼ expanded) as its first cell.
- Click handler:
  - If already cached → toggle `expandedProjects` only.
  - If not cached → add to `loadingSections`, fetch, store result in `sectionCache`, remove from `loadingSections`, add to `expandedProjects`.
- While loading: show a small inline spinner inside the project row (replacing or alongside the chevron).

### `WorkerSectionBreakdown` (new component)

Rendered as a set of `<tr>` elements injected below the parent project row inside the same `<table>`.

Columns (matching existing table column widths):
| Section | Tie | Connect | Earnings |

- Visually indented (padding-left or a blank first cell) to indicate hierarchy.
- Uses the same number formatting as the project row.
- If `sections` is an empty array (project has no activity in date range at section level), show a single "No data" cell spanning the section columns.

---

## What Is Not Changing

- Accommodation is not shown at section level — it remains project-level only.
- Date range selection and "Calculate" behaviour are unchanged.
- Admin views are unchanged.
- No new navigation routes (worker stays on `/wages`).
- CSV export is unchanged (admin-only, unaffected).

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `app/(app)/wages/projects/[projectId]/sections/route.ts` |
| Create | `app/(app)/wages/WorkerSectionBreakdown.tsx` |
| Modify | `lib/portal/wages.ts` — add `computeWagesBySection` + `SectionWageRow` type |
| Modify | `app/(app)/wages/MyWagesView.tsx` — chevron toggle, lazy fetch, render breakdown |
| Modify | `messages/en.json` — any new i18n keys (e.g. `wages.sections`, `wages.noSectionData`) |
| Possibly modify | `lib/portal/wages.test.ts` — unit tests for `computeWagesBySection` |
