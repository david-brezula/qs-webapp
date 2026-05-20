# Worker Section Earnings — Inline Expand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Workers can expand a project row on the wages page to see earnings broken down by section (tie, connect, earnings).

**Architecture:** Add `computeWagesBySection` to the existing pure-function wages library, expose it through a new JSON API route at `/api/wages/projects/[projectId]/sections`, and update `MyWagesView` to lazily fetch and inline-render section rows on chevron click.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma, next-intl, Tailwind CSS, Vitest

---

## File Map

| Action | File |
|--------|------|
| Modify | `lib/portal/wages.ts` — add `SectionWageRow` type + `computeWagesBySection` |
| Modify | `lib/portal/wages.test.ts` — unit tests for `computeWagesBySection` |
| Create | `app/api/wages/projects/[projectId]/sections/route.ts` |
| Create | `app/(app)/wages/WorkerSectionBreakdown.tsx` |
| Modify | `app/(app)/wages/MyWagesView.tsx` — chevron toggle, lazy fetch, inline section rows |

---

## Task 1: Add `SectionWageRow` type and `computeWagesBySection` to wages.ts

**Files:**
- Modify: `lib/portal/wages.ts`
- Modify: `lib/portal/wages.test.ts`

- [ ] **Step 1: Write failing tests in `lib/portal/wages.test.ts`**

Append this block at the end of the file (after the existing `sumWageRows` describe block):

```ts
const sectionBreakdownInput: WageInput & { sections: { id: string; name: string }[] } = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  projectId: "p1",
  workers: [{ id: "w1", name: "Alice" }],
  sections: [
    { id: "s1", name: "North" },
    { id: "s2", name: "South" },
    { id: "s3", name: "East" },
  ],
  prices: [{ projectId: "p1", userId: "w1", priceTie: 1.0, priceConnect: 2.0 }],
  activity: [
    { userId: "w1", projectId: "p1", sectionId: "s1", action: "TIE",     count: 10, workDate: new Date("2026-05-10") },
    { userId: "w1", projectId: "p1", sectionId: "s2", action: "CONNECT", count: 5,  workDate: new Date("2026-05-11") },
    // s3 has no activity
  ],
  accommodations: [],
};

describe("computeWagesBySection", () => {
  it("returns one row per section that has activity", () => {
    const rows = computeWagesBySection(sectionBreakdownInput);
    expect(rows.map((r) => r.sectionId).sort()).toEqual(["s1", "s2"]);
  });

  it("omits sections with zero earnings", () => {
    const rows = computeWagesBySection(sectionBreakdownInput);
    expect(rows.find((r) => r.sectionId === "s3")).toBeUndefined();
  });

  it("computes tie earnings correctly for a section", () => {
    const rows = computeWagesBySection(sectionBreakdownInput);
    const s1 = rows.find((r) => r.sectionId === "s1")!;
    expect(s1.sectionName).toBe("North");
    expect(s1.tie).toBe(10);       // 10 * 1.0
    expect(s1.connect).toBe(0);
    expect(s1.earnings).toBe(10);
  });

  it("computes connect earnings correctly for a section", () => {
    const rows = computeWagesBySection(sectionBreakdownInput);
    const s2 = rows.find((r) => r.sectionId === "s2")!;
    expect(s2.sectionName).toBe("South");
    expect(s2.tie).toBe(0);
    expect(s2.connect).toBe(10);   // 5 * 2.0
    expect(s2.earnings).toBe(10);
  });

  it("preserves section order from input", () => {
    const rows = computeWagesBySection(sectionBreakdownInput);
    expect(rows[0].sectionId).toBe("s1");
    expect(rows[1].sectionId).toBe("s2");
  });
});
```

Also update the import at the top of the test file to include `computeWagesBySection`:

```ts
import { describe, it, expect } from "vitest";
import { computeWages, computeWagesByProject, computeWagesBySection, sumWageRows, type WageInput, type WageRow } from "./wages";
```

- [ ] **Step 2: Run tests — verify they fail**

```
npx vitest run lib/portal/wages.test.ts
```

Expected: 5 failures with "computeWagesBySection is not a function".

- [ ] **Step 3: Add `SectionWageRow` and `computeWagesBySection` to `lib/portal/wages.ts`**

Add these exports at the end of the file, before `ALL_TIME_FROM`:

```ts
export interface SectionWageRow {
  sectionId: string;
  sectionName: string;
  tie: number;
  connect: number;
  earnings: number;
}

/**
 * For a single worker, returns one earnings row per section that had activity
 * within the range. Sections with zero earnings are omitted.
 * Accommodation is not included — it is a project-level deduction.
 */
export function computeWagesBySection(
  input: WageInput & { sections: { id: string; name: string }[] },
): SectionWageRow[] {
  const results: SectionWageRow[] = [];
  for (const section of input.sections) {
    const row = computeWages({ ...input, sectionId: section.id, accommodations: [] }).rows[0];
    if (!row || row.earnings === 0) continue;
    results.push({
      sectionId: section.id,
      sectionName: section.name,
      tie: row.breakdown.tie,
      connect: row.breakdown.connect,
      earnings: row.earnings,
    });
  }
  return results;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```
npx vitest run lib/portal/wages.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```
git add lib/portal/wages.ts lib/portal/wages.test.ts
git commit -m "feat: add computeWagesBySection to wages library"
```

---

## Task 2: Create the API route

**Files:**
- Create: `app/api/wages/projects/[projectId]/sections/route.ts`

- [ ] **Step 1: Create directory and file**

Create `app/api/wages/projects/[projectId]/sections/route.ts` with this content:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withWorkerScope } from "@/lib/prisma-worker";
import { computeWagesBySection } from "@/lib/portal/wages";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { projectId } = await params;
  const url = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(url.searchParams.get("from") ?? today);
  const to = new Date(url.searchParams.get("to") ?? today);

  const userId = session.user.id as string;

  const data = await withWorkerScope(userId, async (tx) => {
    const [prices, activity, sections] = await Promise.all([
      tx.projectWorker.findMany({ where: { projectId } }),
      tx.activityLog.findMany({
        where: {
          table: { section: { projectId } },
          workDate: { gte: from, lte: to },
        },
        include: { projectWorker: true, table: { include: { section: true } } },
      }),
      tx.section.findMany({
        where: { projectId },
        orderBy: { orderIndex: "asc" },
      }),
    ]);
    return { prices, activity, sections };
  });

  const sections = computeWagesBySection({
    from,
    to,
    projectId,
    workers: [{ id: userId, name: (session.user.name as string) ?? "" }],
    prices: data.prices.map((p) => ({
      projectId: p.projectId,
      userId: p.userId,
      priceTie: Number(p.priceTie),
      priceConnect: Number(p.priceConnect),
    })),
    activity: data.activity.map((a) => ({
      userId: a.projectWorker.userId,
      projectId: a.table.section.projectId,
      sectionId: a.table.section.id,
      action: a.action,
      count: a.count,
      workDate: a.workDate,
    })),
    accommodations: [],
    sections: data.sections.map((s) => ({ id: s.id, name: s.name })),
  });

  return NextResponse.json({ sections });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add app/api/wages/projects/
git commit -m "feat: add worker section earnings API route"
```

---

## Task 3: Create `WorkerSectionBreakdown` component

**Files:**
- Create: `app/(app)/wages/WorkerSectionBreakdown.tsx`

The parent table has 7 columns: `[chevron] [Project] [Tie] [Connect] [Earnings] [Accommodation] [Wage]`.
Section rows fill: blank | section name (indented) | tie | connect | earnings | blank | blank.

- [ ] **Step 1: Create `app/(app)/wages/WorkerSectionBreakdown.tsx`**

```tsx
import type { SectionWageRow } from "@/lib/portal/wages";

export function WorkerSectionBreakdown({ sections }: { sections: SectionWageRow[] }) {
  if (sections.length === 0) {
    return (
      <tr>
        <td />
        <td colSpan={6} className="px-4 py-2 pl-10 text-sm text-muted italic">
          No activity in this range.
        </td>
      </tr>
    );
  }
  return (
    <>
      {sections.map((s) => (
        <tr key={s.sectionId} className="bg-bg/30">
          <td />
          <td className="px-4 py-2 pl-10 text-sm text-slate-ink">{s.sectionName}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.tie.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.connect.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.earnings.toFixed(2)}</td>
          <td />
          <td />
        </tr>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add app/\(app\)/wages/WorkerSectionBreakdown.tsx
git commit -m "feat: add WorkerSectionBreakdown component"
```

---

## Task 4: Update `MyWagesView.tsx`

**Files:**
- Modify: `app/(app)/wages/MyWagesView.tsx`

Replace the entire file content with the version below. Changes from the original:
- Import `Fragment` from react, `ChevronRight`/`ChevronDown` from lucide-react, `SectionWageRow` from wages, `WorkerSectionBreakdown`
- Add three state variables: `expandedProjects`, `sectionCache`, `loadingSections`
- Add `useEffect` to reset section state when applied date range props change
- Add `handleToggle` async function for lazy fetch + expand/collapse
- Replace `<DataTable>` with a hand-rolled `<table>` that supports injected section rows
- Each project row has a chevron/spinner first cell and is clickable

- [ ] **Step 1: Replace `app/(app)/wages/MyWagesView.tsx`**

```tsx
"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SectionWageRow, WageByProjectResult } from "@/lib/portal/wages";
import { WorkerSectionBreakdown } from "./WorkerSectionBreakdown";

export function MyWagesView({
  from,
  to,
  result,
}: {
  from: string;
  to: string;
  result: WageByProjectResult;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations("wages");
  const tCommon = useTranslations("common");
  const [f, setF] = useState(from);
  const [tt, setTt] = useState(to);

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [sectionCache, setSectionCache] = useState<Map<string, SectionWageRow[]>>(new Map());
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());

  // When the server returns a new result (date range changed), discard cached sections.
  useEffect(() => {
    setExpandedProjects(new Set());
    setSectionCache(new Map());
    setLoadingSections(new Set());
  }, [from, to]);

  function apply() {
    const params = new URLSearchParams(sp);
    params.set("from", f);
    params.set("to", tt);
    router.push(`/wages?${params.toString()}`);
  }

  async function handleToggle(projectId: string) {
    if (sectionCache.has(projectId)) {
      setExpandedProjects((prev) => {
        const next = new Set(prev);
        if (next.has(projectId)) next.delete(projectId);
        else next.add(projectId);
        return next;
      });
      return;
    }
    setLoadingSections((prev) => new Set(prev).add(projectId));
    try {
      const qs = new URLSearchParams({ from, to });
      const res = await fetch(`/api/wages/projects/${projectId}/sections?${qs}`);
      const data: { sections: SectionWageRow[] } = await res.json();
      setSectionCache((prev) => new Map(prev).set(projectId, data.sections));
      setExpandedProjects((prev) => new Set(prev).add(projectId));
    } finally {
      setLoadingSections((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  }

  const hasTotal = result.total.earnings !== 0 || result.total.accommodation !== 0;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end mb-6">
        <div className="w-full sm:w-auto">
          <label htmlFor="my-wages-from" className="text-xs text-muted block mb-1">{t("from")}</label>
          <input
            id="my-wages-from"
            type="date"
            value={f}
            onChange={(e) => setF(e.target.value)}
            className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="my-wages-to" className="text-xs text-muted block mb-1">{t("to")}</label>
          <input
            id="my-wages-to"
            type="date"
            value={tt}
            onChange={(e) => setTt(e.target.value)}
            className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          />
        </div>
        <Button onClick={apply} variant="primary" className="w-full sm:w-auto">{t("calculate")}</Button>
      </div>

      {result.mixedCurrencies && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("mixedCurrencies")}
        </p>
      )}
      {result.total.warnings.includes("missing-price") && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      {result.byProject.length === 0 ? (
        <div className="rounded-md border border-border-soft bg-surface p-8 text-center text-sm text-muted">
          {t("noData")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border-soft bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("project")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("tie")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("connect")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("earnings")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("accommodation")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("wage")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {result.byProject.map((p) => (
                <Fragment key={p.projectId}>
                  <tr
                    className="hover:bg-bg/50 cursor-pointer"
                    onClick={() => handleToggle(p.projectId)}
                  >
                    <td className="px-4 py-3 text-muted align-middle">
                      {loadingSections.has(p.projectId) ? (
                        <span className="text-xs">…</span>
                      ) : expandedProjects.has(p.projectId) ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.projectName}</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.breakdown.tie.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.breakdown.connect.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.earnings.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.accommodation.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.wage.toFixed(2)}</td>
                  </tr>
                  {expandedProjects.has(p.projectId) && (
                    <WorkerSectionBreakdown sections={sectionCache.get(p.projectId) ?? []} />
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasTotal && (
        <div className="mt-4 rounded-md border border-border-soft bg-bg p-4">
          <div className="text-xs uppercase tracking-[0.15em] font-semibold text-navy/70 mb-3">
            {tCommon("total")}
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">{t("tie")}</dt>
              <dd className="font-semibold text-navy">{result.total.breakdown.tie.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("connect")}</dt>
              <dd className="font-semibold text-navy">{result.total.breakdown.connect.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("earnings")}</dt>
              <dd className="font-semibold text-navy">{result.total.earnings.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("accommodation")}</dt>
              <dd className="font-semibold text-navy">{result.total.accommodation.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("wage")}</dt>
              <dd className="font-semibold text-navy">{result.total.wage.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```
git add app/\(app\)/wages/MyWagesView.tsx
git commit -m "feat: worker section earnings inline expand"
```
