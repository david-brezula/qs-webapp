# Highlight Finished Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give finished tables in the work portal a green standout card and a "Done" badge so completed work is obvious at a glance.

**Architecture:** Extract the "finished" rule into a pure, vitest-tested helper (`lib/portal/table-status.ts`), matching the existing `lib/portal/` helper pattern (`computeModules`, over-cap). Add a `tone` prop to the shared `Card` component for the green styling. Wire both into `TableLogger`, which is the single component rendering tables on both the project overview and log pages.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, next-intl, vitest, lucide-react.

---

### Task 1: `isTableFinished` helper

A table is finished when it has real capacity and both tied and connected counts
have reached that capacity. This rule lives in a pure function so it can be unit
tested, following the existing `lib/portal/modules.ts` pattern.

**Files:**
- Create: `lib/portal/table-status.ts`
- Test: `lib/portal/table-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/portal/table-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isTableFinished } from "./table-status";

describe("isTableFinished", () => {
  it("is finished when tied and connected both reach total", () => {
    expect(isTableFinished({ total: 100, tied: 100, connected: 100 })).toBe(true);
  });

  it("is finished when counts exceed total (over-cap)", () => {
    expect(isTableFinished({ total: 100, tied: 120, connected: 105 })).toBe(true);
  });

  it("is not finished when tied is short", () => {
    expect(isTableFinished({ total: 100, tied: 99, connected: 100 })).toBe(false);
  });

  it("is not finished when connected is short", () => {
    expect(isTableFinished({ total: 100, tied: 100, connected: 50 })).toBe(false);
  });

  it("is not finished when total is 0 even if counts are 0", () => {
    expect(isTableFinished({ total: 0, tied: 0, connected: 0 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- table-status`
Expected: FAIL — `isTableFinished` cannot be imported (file does not exist).

- [ ] **Step 3: Write minimal implementation**

Create `lib/portal/table-status.ts`:

```ts
export interface TableProgress {
  total: number;
  tied: number;
  connected: number;
}

/**
 * A table is "finished" when it has real module capacity and both the tying
 * and connecting work have reached (or passed) that capacity. The `total > 0`
 * guard keeps an empty table from falsely reading as done.
 */
export function isTableFinished({ total, tied, connected }: TableProgress): boolean {
  return total > 0 && tied >= total && connected >= total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- table-status`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/portal/table-status.ts lib/portal/table-status.test.ts
git commit -m "feat: add isTableFinished helper"
```

---

### Task 2: Add `tone` prop to `Card`

The `Card` component currently hardcodes a neutral background and border. Add an
optional `tone` prop so a card can opt into a green "success" appearance. The
prop selects the background/border classes *inside* the component — passing
override classes via `className` is unreliable because Tailwind cannot
guarantee which of two colliding `bg-*` utilities wins.

There is no React component test harness in this project (`@testing-library`
is not installed), so this task is verified by lint + build, consistent with
how the rest of the component layer is checked.

**Files:**
- Modify: `components/ui/Card.tsx`

- [ ] **Step 1: Replace the Card implementation**

Replace the entire contents of `components/ui/Card.tsx` with:

```tsx
import { ReactNode } from "react";

type CardTone = "default" | "success";

const TONE_CLASSES: Record<CardTone, string> = {
  default:
    "bg-[var(--color-canvas)] border-[var(--color-rule)] hover:border-[var(--color-ink)]/40",
  success: "bg-emerald-50 border-emerald-500 hover:border-emerald-600",
};

export function Card({
  children,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
}) {
  return (
    <div
      className={`lift relative border rounded-[var(--radius-card)] p-7 ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
```

Note: the `default` tone reproduces the original classes exactly
(`bg-[var(--color-canvas)]`, `border-[var(--color-rule)]`,
`hover:border-[var(--color-ink)]/40`), so existing `Card` usages are unchanged.
The standalone `border` class is kept so both tones get a 1px border.

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings for `components/ui/Card.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/ui/Card.tsx
git commit -m "feat: add success tone to Card component"
```

---

### Task 3: Wire finished-table styling into `TableLogger`

Add the `done` translation key, thread it through `ProjectLogView` into the
`labels` object, and use `isTableFinished` in `TableLogger` to switch the card
tone and render a "Done" badge next to the table name.

`TableLogger` is rendered (via `ProjectLogView`) by both the project overview
page and the log page, so this single change covers every place a table
appears.

**Files:**
- Modify: `messages/en.json:144` (inside the `log` namespace)
- Modify: `messages/sk.json:144` (inside the `log` namespace)
- Modify: `components/portal/ProjectLogView.tsx:119-143` (the `labels` object)
- Modify: `app/(app)/projects/[projectId]/log/TableLogger.tsx`

- [ ] **Step 1: Add the `done` key to `messages/en.json`**

In `messages/en.json`, the `log` namespace currently ends with:

```json
    "notInProject": "not in project"
  },
```

Change it to (add a comma after the `notInProject` line, then the new key):

```json
    "notInProject": "not in project",
    "done": "Done"
  },
```

- [ ] **Step 2: Add the `done` key to `messages/sk.json`**

In `messages/sk.json`, the `log` namespace currently ends with:

```json
    "notInProject": "nie je v projekte"
  },
```

Change it to:

```json
    "notInProject": "nie je v projekte",
    "done": "Hotovo"
  },
```

- [ ] **Step 3: Thread the `done` label through `ProjectLogView`**

In `components/portal/ProjectLogView.tsx`, the `labels` object passed to
`TableLogger` currently ends with:

```tsx
                    noWorkersToClaim: t("noWorkersToClaim"),
                    notInProject: t("notInProject"),
                  }}
```

Change it to:

```tsx
                    noWorkersToClaim: t("noWorkersToClaim"),
                    notInProject: t("notInProject"),
                    done: t("done"),
                  }}
```

- [ ] **Step 4: Import `isTableFinished` and `CheckCircle2` in `TableLogger`**

In `app/(app)/projects/[projectId]/log/TableLogger.tsx`, the import block at the
top currently includes:

```tsx
import { ChevronRight } from "lucide-react";
```

Change that line to:

```tsx
import { ChevronRight, CheckCircle2 } from "lucide-react";
```

Then, after the existing `import` lines (below the
`import { ... } from "@/lib/actions/activity";` line), add:

```tsx
import { isTableFinished } from "@/lib/portal/table-status";
```

- [ ] **Step 5: Compute `isFinished` inside the component**

In `app/(app)/projects/[projectId]/log/TableLogger.tsx`, find the line that
defines `canSubmit` and `canClaim` (around line 135):

```tsx
  const canSubmit = Boolean(myClaim) && !isClosed;
  const canClaim = !myClaim && isAssigned && !isClosed;
```

Add immediately below it:

```tsx
  const isFinished = isTableFinished({
    total: table.total,
    tied: table.tied,
    connected: table.connected,
  });
```

- [ ] **Step 6: Apply the success tone to the Card**

In the same file, the component's returned JSX opens with:

```tsx
  return (
    <Card className={`p-3 ${openFraction ? "z-20" : ""}`}>
```

Change the `Card` opening tag to:

```tsx
  return (
    <Card tone={isFinished ? "success" : "default"} className={`p-3 ${openFraction ? "z-20" : ""}`}>
```

- [ ] **Step 7: Render the "Done" badge next to the table name**

In the same file, the header row starts with the table name heading:

```tsx
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="text-sm font-semibold text-navy">{table.name}</h3>
```

Insert the badge immediately after the `<h3>` line, so the block reads:

```tsx
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="text-sm font-semibold text-navy">{table.name}</h3>
        {isFinished && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
            <CheckCircle2 size={12} />
            {labels.done}
          </span>
        )}
```

- [ ] **Step 8: Verify lint passes**

Run: `npm run lint`
Expected: no new errors or warnings.

- [ ] **Step 9: Verify the production build compiles**

Run: `npm run build`
Expected: build succeeds — confirms the next-intl message keys and TypeScript
types all resolve.

- [ ] **Step 10: Verify the full test suite still passes**

Run: `npm test`
Expected: PASS — all suites including `table-status` are green.

- [ ] **Step 11: Manual visual check**

Run `npm run dev`, open a project that has at least one table whose tied and
connected totals both meet the table's module capacity, and one that does not.
Confirm:
- The finished table's card has a green border and a faint green background.
- A green "Done" badge with a check icon sits next to the finished table's name.
- The unfinished table's card and any other `Card` on the page look unchanged.

- [ ] **Step 12: Commit**

```bash
git add messages/en.json messages/sk.json components/portal/ProjectLogView.tsx app/(app)/projects/[projectId]/log/TableLogger.tsx
git commit -m "feat: highlight finished tables with green card and Done badge"
```

---

## Self-Review Notes

- **Spec coverage:** "Finished" rule → Task 1. `Card` `tone` prop → Task 2.
  `TableLogger` compute/tone/badge → Task 3 steps 4-7. `log.done` in both
  locales → Task 3 steps 1-2. `ProjectLogView` label threading → Task 3 step 3.
  Edge cases (zero capacity, over-cap) → Task 1 tests. All spec sections covered.
- **Placeholder scan:** No TBD/TODO; every code step shows full code.
- **Type consistency:** `isTableFinished` takes `{ total, tied, connected }`
  (`TableProgress`) in Task 1 and is called with exactly those keys in Task 3
  step 5. `CardTone` / `tone` prop names match between Task 2 and Task 3 step 6.
  `labels.done` is added in Task 3 step 3 and read in step 7.
