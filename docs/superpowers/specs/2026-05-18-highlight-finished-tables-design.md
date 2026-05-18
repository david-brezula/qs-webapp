# Highlight Finished Tables in the Work Portal

**Date:** 2026-05-18
**Status:** Approved

## Problem

In the work portal, each project is broken into sections, and each section
contains "tables" (rendering modules). A worker logs tied and connected counts
against each table. Today every table card looks identical regardless of
progress, so there is no at-a-glance signal of which tables are complete.

## Goal

When a table is finished, make its card stand out — a green standout treatment
plus a "Done" badge — so completed work is obvious without reading the numbers.

## Definition of "Finished"

A table is finished when **both** the tying and connecting work are fully done:

```
isFinished = table.total > 0
          && table.tied >= table.total
          && table.connected >= table.total
```

The `table.total > 0` guard prevents an empty or zero-capacity table from
falsely reading as "Done" (since `0 >= 0` would otherwise be true).

`total` is the computed module capacity (`computeModules(...)`), and `tied` /
`connected` are the aggregate counts — all three are already passed into
`TableLogger` via the `table` prop. No new data fetching is required.

## Scope

The only component that renders "tables" is `TableLogger`. It is shared by:

- the project overview page (`app/(app)/projects/[projectId]/page.tsx`)
- the log page (`app/(app)/projects/[projectId]/log/page.tsx`)

Both render tables through `ProjectLogView` → `TableLogger`. A single change to
`TableLogger` therefore covers every place a table appears.

## Components and Changes

### 1. `components/ui/Card.tsx`

Add an optional `tone` prop:

```ts
tone?: "default" | "success";
```

- `default` (the default) — keeps the current styling exactly:
  `bg-[var(--color-canvas)]`, `border-[var(--color-rule)]`,
  `hover:border-[var(--color-ink)]/40`.
- `success` — emerald standout: emerald border and a subtle emerald-tinted
  background (Tailwind built-in `emerald` palette, e.g. `border-emerald-500`
  and `bg-emerald-50`).

The tone is applied by selecting the background/border classes inside `Card`
based on the prop, rather than by passing override classes through
`className`. This avoids Tailwind's unreliable resolution when two `bg-*`
utilities collide in the class string. The `className` prop continues to work
as before for layout tweaks (e.g. `p-3`, `z-20`).

### 2. `app/(app)/projects/[projectId]/log/TableLogger.tsx`

- Compute `isFinished` from the `table` prop using the rule above.
- Pass `tone={isFinished ? "success" : "default"}` to the `Card`.
- Render a small "Done" badge next to the table name (`<h3>{table.name}</h3>`)
  when `isFinished` — a green pill with a check icon (`CheckCircle2` from
  `lucide-react`, already a dependency) and the localized "Done" label.

All other card content (counters, claims, expand/collapse, recent entries)
is unchanged.

### 3. Localization — `messages/en.json` and `messages/sk.json`

Add a `done` key to the existing `log` namespace:

- `en.json`: `"done": "Done"`
- `sk.json`: Slovak equivalent (`"done": "Hotovo"`)

### 4. `components/portal/ProjectLogView.tsx`

Thread the new label through the existing `labels` object passed to
`TableLogger`: `done: t("done")` (where `t` is the `log` namespace translator
already in scope).

## Data Flow

```
page.tsx (overview / log)
  → ProjectLogView   (builds labels incl. labels.done)
    → TableLogger    (computes isFinished from table prop)
      → Card         (tone="success" when finished)
      → "Done" badge (rendered when finished)
```

No server actions, database, or aggregate-query changes. `tied`, `connected`,
and `total` already reach `TableLogger`.

## Error Handling / Edge Cases

- **Zero-capacity table** (`total === 0`): not finished — excluded by the
  `total > 0` guard.
- **Over-cap counts** (`tied > total`): still finished — `>=` covers it.
- **Closed project:** the finished treatment is purely visual and applies
  regardless of project status; no interaction with `isClosed`.

## Testing

- A table with `tied >= total` and `connected >= total` (and `total > 0`)
  renders the `success` Card tone and the "Done" badge.
- A table missing either condition renders the `default` tone and no badge.
- A table with `total === 0` renders the `default` tone and no badge.
- `Card` without a `tone` prop renders identically to before this change.

## Out of Scope

- Section-level or project-level "finished" rollups.
- Sorting or filtering tables by completion.
- Any change to how `tied` / `connected` / `total` are computed.
