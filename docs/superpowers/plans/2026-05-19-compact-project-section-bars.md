# Compact Project & Section Progress Bars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cap the `project` and `section` progress bars at the same fixed `w-40` (160px) width already used by the `table` bars.

**Architecture:** Two class changes in `ProgressGraph.tsx` — the `project` variant's bar tracks and the `section` variant's bar wrapper switch from `flex-1` (full width) to a fixed `w-40`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4.

---

### Task 1: Cap the project and section bars at `w-40`

`ProgressGraph` is presentational and the project has no React component test
harness, so this task is verified by `npm run lint` + `npm run build`,
consistent with the rest of the component layer.

**Files:**
- Modify: `components/portal/ProgressGraph.tsx`

- [ ] **Step 1: Make the `section` variant's bar wrapper a fixed width**

In `components/portal/ProgressGraph.tsx`, the `section` variant currently
opens with:

```tsx
  if (variant === "section") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col gap-1">
```

Change the inner wrapper's `flex-1` to `w-40`:

```tsx
  if (variant === "section") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex w-40 flex-col gap-1">
```

- [ ] **Step 2: Make the `project` variant's bar tracks a fixed width**

In the same file, the `project` variant renders two `ProgressBar`s, each
currently with `trackClass="flex-1"`:

```tsx
      <div className="space-y-2.5">
        <ProgressBar
          label={labels?.tied}
          pct={tiedPct}
          readout={`${tiedPct}%`}
          fillClass="bg-accent"
          trackClass="flex-1"
        />
        <ProgressBar
          label={labels?.connected}
          pct={connectedPct}
          readout={`${connectedPct}%`}
          fillClass="bg-blue-900"
          trackClass="flex-1"
        />
      </div>
```

Change both `trackClass="flex-1"` to `trackClass="w-40"`:

```tsx
      <div className="space-y-2.5">
        <ProgressBar
          label={labels?.tied}
          pct={tiedPct}
          readout={`${tiedPct}%`}
          fillClass="bg-accent"
          trackClass="w-40"
        />
        <ProgressBar
          label={labels?.connected}
          pct={connectedPct}
          readout={`${connectedPct}%`}
          fillClass="bg-blue-900"
          trackClass="w-40"
        />
      </div>
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings for `components/portal/ProgressGraph.tsx`.
(A pre-existing `Date.now` error in `TableLogger.tsx` is unrelated — ignore it.)

- [ ] **Step 4: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual visual check**

Run `npm run dev` and open a project (`/projects/<id>`), its log page
(`/projects/<id>/log`), and a section page. Confirm:
- The project progress block's two bars are ~160px wide and left-aligned, not
  stretched across the block.
- The section progress bars (in the section-list rows and the section page
  heading) are ~160px wide, not stretched.
- The table-card bars are unchanged (already `w-40`).

- [ ] **Step 6: Commit**

```bash
git add components/portal/ProgressGraph.tsx
git commit -m "feat: compact fixed-width project and section progress bars"
```

---

## Self-Review Notes

- **Spec coverage:** `section` variant wrapper `flex-1` → `w-40` → Step 1.
  `project` variant both `ProgressBar` `trackClass` `flex-1` → `w-40` → Step 2.
  `table` variant untouched (already `w-40`). Single file
  (`components/portal/ProgressGraph.tsx`) — matches the spec's "Affected Files".
- **Placeholder scan:** No TBD/TODO; both code steps show the complete
  before/after.
- **Type consistency:** No type or signature changes — only Tailwind class
  strings change. `ProgressBar`'s `trackClass: string` prop already exists and
  still receives a string.
