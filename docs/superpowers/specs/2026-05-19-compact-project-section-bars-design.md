# Compact Project & Section Progress Bars

**Date:** 2026-05-19
**Status:** Approved

## Problem

The project progress block (`ProgressGraph` `variant="project"`) and the
section progress bars (`variant="section"`) stretch the full available width.
The table-card bars (`variant="table"`) were already capped at a fixed
`w-40` (160px) in an earlier change, so the progress bars across the app are
now inconsistent — the project and section bars look stretched.

## Goal

Cap the project-block and section progress bars at the same fixed `w-40`
(160px) used by the table-card bars, for one consistent compact bar width.

## Scope

`components/portal/ProgressGraph.tsx` only — the `project` and `section`
variants. The `table` variant is already `w-40` and is untouched.

Because `ProgressGraph` is shared, this caps the project block and section
bars wherever they render: the project overview page, the log page, and the
section page heading. That is intentional — consistent bar width everywhere.

## Change

In `components/portal/ProgressGraph.tsx`:

- **`project` variant** — both `ProgressBar` calls currently pass
  `trackClass="flex-1"`. Change both to `trackClass="w-40"`.
- **`section` variant** — the two-bar wrapper is currently
  `<div className="flex flex-1 flex-col gap-1">`. Change it to
  `<div className="flex w-40 flex-col gap-1">`.

With a fixed-width track and no `flex-1` child, the row's elements (label,
bar, readout) take their natural widths and cluster to the left; the rest of
the container width stays empty.

## Affected Files

- `components/portal/ProgressGraph.tsx` — the only file changed.

No data flow, prop-contract, or behaviour changes — purely the bar track
width.

## Testing

`ProgressGraph` is presentational and the project has no React component test
harness, so this is verified by `npm run lint`, `npm run build`, and a manual
check: on the project overview page, the log page, and a section page, the
project block bars and section bars are ~160px wide and left-aligned, not
stretched to the full width.

## Out of Scope

- The `table` variant (already `w-40`).
- Bar height, colours, the `% · %` readout, or layout beyond the track width.
