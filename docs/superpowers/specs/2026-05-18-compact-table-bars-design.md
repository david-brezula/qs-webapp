# Compact Table-Card Progress Bars

**Date:** 2026-05-18
**Status:** Approved

## Problem

The two progress bars on each "log work" table card (the `table` variant of
`ProgressGraph`) use a `flex-1` bar track, so each bar stretches across the
full width of the card. They read as too long.

## Goal

Make the table-card bars compact: a fixed, shorter bar width so the
`Tied` / `Connected` rows cluster on the left of the card.

## Scope

Only the `table` variant of `ProgressGraph`. The `project` variant (project
progress block) and the `section` variant keep their current full-width
behaviour — unchanged.

## Change

`ProgressGraph` contains an internal `ProgressBar` sub-component whose bar
track is currently hardcoded `h-2.5 flex-1 …`. The `flex-1` makes the track
fill all remaining row width.

- Add a prop to `ProgressBar` for the track's width class — e.g.
  `trackClass: string` — applied in place of the hardcoded `flex-1`.
- The `project` variant passes `trackClass="flex-1"` (unchanged appearance).
- The `table` variant passes `trackClass="w-40"` — a fixed 160px track.

With a fixed-width track and no `flex-1` child, the `flex` row's children
(label, track, readout) take their natural widths and cluster at the left of
the card.

The `section` variant does not use `ProgressBar`, so it needs no change.

## Affected Files

- `components/portal/ProgressGraph.tsx` — the only file changed.

No data flow, prop-contract (`ProgressGraph`'s public props), or behaviour
changes. `ProgressBar` is a private sub-component, so adding a required prop to
it only affects its two call sites within the same file.

## Testing

`ProgressGraph` is presentational and the project has no React component test
harness, so this is verified by `npm run lint`, `npm run build`, and a manual
visual check: on a project log page, each table card's two bars are short
(~160px) and left-clustered, while the project block and section bars are
unchanged.

## Out of Scope

- Bar height or row spacing changes.
- The project block and section bars.
