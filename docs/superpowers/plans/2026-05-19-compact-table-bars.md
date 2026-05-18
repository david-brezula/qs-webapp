# Compact Table-Card Progress Bars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `table`-variant progress bars a fixed, shorter width so they no longer stretch across the full card.

**Architecture:** `ProgressGraph`'s internal `ProgressBar` sub-component hardcodes `flex-1` on its bar track. Add a `trackClass` prop so each variant chooses the track width — the `table` variant passes a fixed `w-40`, the `project` variant keeps `flex-1`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4.

---

### Task 1: Add a `trackClass` prop to `ProgressBar`

`ProgressGraph` is presentational and the project has no React component test
harness, so this task is verified by lint + build, consistent with the rest of
the component layer.

**Files:**
- Modify: `components/portal/ProgressGraph.tsx`

- [ ] **Step 1: Add the `trackClass` prop to `ProgressBar`**

In `components/portal/ProgressGraph.tsx`, the `ProgressBar` sub-component
currently is:

```tsx
function ProgressBar({
  label,
  pct,
  readout,
  fillClass,
}: {
  label?: string;
  pct: number;
  readout: string;
  fillClass: string;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 text-slate-ink">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border-soft">
        <div
          className={`h-full rounded-full ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right font-semibold text-navy">
        {readout}
      </span>
    </div>
  );
}
```

Replace it with (new `trackClass` prop; the track's hardcoded `flex-1` becomes
`${trackClass}`):

```tsx
function ProgressBar({
  label,
  pct,
  readout,
  fillClass,
  trackClass,
}: {
  label?: string;
  pct: number;
  readout: string;
  fillClass: string;
  trackClass: string;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 text-slate-ink">{label}</span>
      <div
        className={`h-2.5 ${trackClass} overflow-hidden rounded-full bg-border-soft`}
      >
        <div
          className={`h-full rounded-full ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right font-semibold text-navy">
        {readout}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Pass `trackClass="w-40"` from the `table` variant**

In the same file, the `table` variant currently renders:

```tsx
      <div className="space-y-1.5">
        <ProgressBar
          label={labels?.tied}
          pct={tiedPct}
          readout={`${tied} / ${total}`}
          fillClass={tiedFill}
        />
        <ProgressBar
          label={labels?.connected}
          pct={connectedPct}
          readout={`${connected} / ${total}`}
          fillClass={connectedFill}
        />
      </div>
```

Change it to add `trackClass="w-40"` to both `ProgressBar`s:

```tsx
      <div className="space-y-1.5">
        <ProgressBar
          label={labels?.tied}
          pct={tiedPct}
          readout={`${tied} / ${total}`}
          fillClass={tiedFill}
          trackClass="w-40"
        />
        <ProgressBar
          label={labels?.connected}
          pct={connectedPct}
          readout={`${connected} / ${total}`}
          fillClass={connectedFill}
          trackClass="w-40"
        />
      </div>
```

- [ ] **Step 3: Pass `trackClass="flex-1"` from the `project` variant**

In the same file, the `project` variant currently renders:

```tsx
      <div className="space-y-2.5">
        <ProgressBar
          label={labels?.tied}
          pct={tiedPct}
          readout={`${tiedPct}%`}
          fillClass="bg-accent"
        />
        <ProgressBar
          label={labels?.connected}
          pct={connectedPct}
          readout={`${connectedPct}%`}
          fillClass="bg-blue-900"
        />
      </div>
```

Change it to add `trackClass="flex-1"` to both `ProgressBar`s (this preserves
the project block's current full-width bars):

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

- [ ] **Step 4: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings for `components/portal/ProgressGraph.tsx`.

- [ ] **Step 5: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds — confirms `ProgressBar`'s new required prop is
supplied at every call site (the `section` variant does not use `ProgressBar`,
so it is unaffected).

- [ ] **Step 6: Manual visual check**

Run `npm run dev` and open a project log page (`/projects/<id>/log`). Confirm:
- Each table card's two bars are short (~160px) and the label / bar / readout
  cluster on the left of the card.
- The project progress block's bars and the per-section bars are unchanged
  (still full width).

- [ ] **Step 7: Commit**

```bash
git add components/portal/ProgressGraph.tsx
git commit -m "feat: compact fixed-width bars on table cards"
```

---

## Self-Review Notes

- **Spec coverage:** `trackClass` prop on `ProgressBar` → Step 1. `table`
  variant fixed `w-40` width → Step 2. `project` variant keeps `flex-1` →
  Step 3. `section` variant untouched (does not use `ProgressBar`) — noted in
  Step 5. Single file (`components/portal/ProgressGraph.tsx`) — matches the
  spec's "Affected Files".
- **Placeholder scan:** No TBD/TODO; every code step shows complete code.
- **Type consistency:** `trackClass: string` is added to `ProgressBar`'s props
  in Step 1 and supplied at all four call sites in Steps 2-3, so the build in
  Step 5 type-checks.
