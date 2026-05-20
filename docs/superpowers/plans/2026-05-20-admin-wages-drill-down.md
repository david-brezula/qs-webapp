# Admin Wages Drill-Down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin `/wages` flat per-worker table with a project → section drill-down. All-time wages are the primary figure on every row; the existing `from`/`to` filter produces a smaller "range total" rendered alongside.

**Architecture:** Three new server-component pages live under `/wages/projects/[id]/[sections/[sid]]/`. Each page calls the pure `computeWages` twice — once with an extreme-wide range for the all-time figure, once with the user-selected range — and renders via dedicated presentational client components. `computeWages` is extended additively with an optional `sectionId` filter so section-level scoping reuses the existing rate/range/accommodation logic. The worker `/wages` view, RLS, and the per-worker date-range CSV export are not touched.

**Tech Stack:** Next.js 16 (App Router, server + client components, `searchParams: Promise<...>`), Prisma 7, next-intl v4, Vitest, Tailwind.

**Project note:** This is a customised Next.js — per `AGENTS.md`, consult `node_modules/next/dist/docs/` before using unfamiliar Next APIs. This plan uses only patterns already in the repo (server components, `Link`, `useRouter`/`useSearchParams`, `usePathname`).

**Spec:** `docs/superpowers/specs/2026-05-20-admin-wages-drill-down-design.md`

---

## File Structure

**New**

- `app/(app)/wages/WageDateFilter.tsx` — shared client-side date-range filter used by all three admin wage pages.
- `app/(app)/wages/AdminSectionWageView.tsx` — section page presentational component (per-worker tie/connect/earnings, no accommodation).
- `app/(app)/wages/AdminProjectWageView.tsx` — project page presentational component (sections panel + per-worker summary panel).
- `app/(app)/wages/AdminProjectList.tsx` — `/wages` top-level presentational component (per-project rows).
- `app/(app)/wages/projects/[projectId]/sections/[sectionId]/page.tsx` — section page server component.
- `app/(app)/wages/projects/[projectId]/page.tsx` — project page server component.

**Modified**

- `lib/portal/wages.ts` — additive: `sectionId?: string` on `WageInput.activity[]`, `sectionId?: string | null` on `WageInput`, new `WageTotals` type, new `sumWageRows` helper. `computeWages` body gains one `continue` line.
- `lib/portal/wages.test.ts` — tests for the new filter and helper.
- `app/(app)/wages/page.tsx` — admin branch renders `AdminProjectList`; worker branch unchanged.
- `messages/en.json`, `messages/sk.json` — `wages.allTimeHelper`, `wages.sections`, `wages.workersSummary` keys.

**Removed**

- `app/(app)/wages/WagesView.tsx` — superseded by `AdminProjectList`. (Not imported by anything else after Task 7.)

**Known pre-existing lint state**

The repo has 1 known lint error (`react-hooks/purity` in `app/(app)/projects/[projectId]/log/TableLogger.tsx:397`) and 3 unused-var warnings unrelated to this feature. Every UI task below runs `npm run lint` and `npm run build` as **separate commands** and passes if no NEW lint problems are introduced and the build succeeds.

---

## Task 1: Extend `computeWages` with optional `sectionId` filter (TDD)

**Files:**
- Modify: `lib/portal/wages.ts`
- Test: `lib/portal/wages.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/portal/wages.test.ts`:
```ts
const sectionedInput: WageInput = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  workers: [{ id: "w1", name: "Alice" }],
  prices: [{ projectId: "p1", userId: "w1", priceTie: 1.0, priceConnect: 2.0 }],
  activity: [
    { userId: "w1", projectId: "p1", sectionId: "s1", action: "TIE", count: 10, workDate: new Date("2026-05-10") },
    { userId: "w1", projectId: "p1", sectionId: "s2", action: "CONNECT", count: 5, workDate: new Date("2026-05-11") },
  ],
  accommodations: [],
};

describe("computeWages sectionId filter", () => {
  it("counts only activity in the filtered section", () => {
    // s1 has only the TIE 10 entry: 10 * 1.0 = 10
    const r = computeWages({ ...sectionedInput, sectionId: "s1" });
    expect(r.rows[0].earnings).toBe(10);
    expect(r.rows[0].breakdown.tie).toBe(10);
    expect(r.rows[0].breakdown.connect).toBe(0);
  });

  it("returns zero earnings when sectionId matches no activity", () => {
    const r = computeWages({ ...sectionedInput, sectionId: "s-none" });
    expect(r.rows[0].earnings).toBe(0);
  });

  it("ignores sectionId when omitted (counts every section)", () => {
    // 10*1.0 + 5*2.0 = 20
    const r = computeWages(sectionedInput);
    expect(r.rows[0].earnings).toBe(20);
  });

  it("applies sectionId together with projectId", () => {
    const r = computeWages({ ...sectionedInput, projectId: "p1", sectionId: "s2" });
    expect(r.rows[0].earnings).toBe(10); // 5 * 2.0
    expect(r.rows[0].breakdown.connect).toBe(10);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- wages`
Expected: FAIL — TypeScript will error on the literal `sectionId` field on the activity object and the `sectionId` property on the call argument. The four existing `computeWages` and four `computeWagesByProject` tests still pass.

- [ ] **Step 3: Add the `sectionId` field and filter to `lib/portal/wages.ts`**

In `lib/portal/wages.ts`, replace the `WageInput` interface:
```ts
export interface WageInput {
  from: Date;
  to: Date;
  projectId?: string | null;
  workers: { id: string; name: string }[];
  prices: {
    projectId: string;
    userId: string;
    priceTie: number;
    priceConnect: number;
  }[];
  activity: {
    userId: string;
    projectId: string;
    action: "TIE" | "CONNECT";
    count: number;
    workDate: Date;
  }[];
  accommodations: {
    id: string;
    totalCost: number;
    currency: Currency;
    startDate: Date;
    endDate: Date;
    workerIds: string[];
    projectId: string | null;
  }[];
}
```
with:
```ts
export interface WageInput {
  from: Date;
  to: Date;
  projectId?: string | null;
  sectionId?: string | null;
  workers: { id: string; name: string }[];
  prices: {
    projectId: string;
    userId: string;
    priceTie: number;
    priceConnect: number;
  }[];
  activity: {
    userId: string;
    projectId: string;
    sectionId?: string;
    action: "TIE" | "CONNECT";
    count: number;
    workDate: Date;
  }[];
  accommodations: {
    id: string;
    totalCost: number;
    currency: Currency;
    startDate: Date;
    endDate: Date;
    workerIds: string[];
    projectId: string | null;
  }[];
}
```

Then, inside `computeWages`, replace the two-line projectFilter setup:
```ts
  const range = { start: input.from, end: input.to };
  const projectFilter = input.projectId ?? null;
```
with:
```ts
  const range = { start: input.from, end: input.to };
  const projectFilter = input.projectId ?? null;
  const sectionFilter = input.sectionId ?? null;
```

Finally, inside the `for (const a of input.activity)` loop, replace:
```ts
  for (const a of input.activity) {
    if (projectFilter && a.projectId !== projectFilter) continue;
    if (a.workDate < range.start || a.workDate > range.end) continue;
```
with:
```ts
  for (const a of input.activity) {
    if (projectFilter && a.projectId !== projectFilter) continue;
    if (sectionFilter && a.sectionId !== sectionFilter) continue;
    if (a.workDate < range.start || a.workDate > range.end) continue;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- wages`
Expected: PASS — all `computeWages`, `computeWages sectionId filter`, and `computeWagesByProject` tests green (12 + 4 = 16 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/portal/wages.ts lib/portal/wages.test.ts
git commit -m "feat: optional sectionId filter on computeWages"
```

---

## Task 2: Add `sumWageRows` helper (TDD)

**Files:**
- Modify: `lib/portal/wages.ts`
- Test: `lib/portal/wages.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/portal/wages.test.ts`:
```ts
describe("sumWageRows", () => {
  it("sums tie / connect / earnings / accommodation / wage across rows", () => {
    const rows: WageRow[] = [
      { userId: "w1", name: "A", earnings: 10, accommodation: 2, wage: 8,
        breakdown: { tie: 6, connect: 4 }, warnings: [] },
      { userId: "w2", name: "B", earnings: 20, accommodation: 5, wage: 15,
        breakdown: { tie: 12, connect: 8 }, warnings: ["missing-price"] },
    ];
    const t = sumWageRows(rows);
    expect(t.tie).toBe(18);
    expect(t.connect).toBe(12);
    expect(t.earnings).toBe(30);
    expect(t.accommodation).toBe(7);
    expect(t.wage).toBe(23);
    expect(t.warnings).toEqual(["missing-price"]);
  });

  it("returns zeros for empty input", () => {
    expect(sumWageRows([])).toEqual({
      tie: 0, connect: 0, earnings: 0, accommodation: 0, wage: 0, warnings: [],
    });
  });

  it("deduplicates warnings across rows", () => {
    const rows: WageRow[] = [
      { userId: "w1", name: "A", earnings: 0, accommodation: 0, wage: 0,
        breakdown: { tie: 0, connect: 0 }, warnings: ["missing-price"] },
      { userId: "w2", name: "B", earnings: 0, accommodation: 0, wage: 0,
        breakdown: { tie: 0, connect: 0 }, warnings: ["missing-price"] },
    ];
    expect(sumWageRows(rows).warnings).toEqual(["missing-price"]);
  });
});
```

Also update the import line at the top of `lib/portal/wages.test.ts` — replace:
```ts
import { computeWages, computeWagesByProject, type WageInput } from "./wages";
```
with:
```ts
import { computeWages, computeWagesByProject, sumWageRows, type WageInput, type WageRow } from "./wages";
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- wages`
Expected: FAIL — `sumWageRows is not a function` (or import error). The previous 16 tests still pass.

- [ ] **Step 3: Implement `sumWageRows` and `WageTotals`**

Append to `lib/portal/wages.ts`:
```ts
export interface WageTotals {
  tie: number;
  connect: number;
  earnings: number;
  accommodation: number;
  wage: number;
  warnings: string[];
}

/**
 * Sums a list of WageRow into one combined total. Used by admin wage views
 * that aggregate across all workers for a project or section. Warnings are
 * deduplicated.
 */
export function sumWageRows(rows: WageRow[]): WageTotals {
  const totals: WageTotals = {
    tie: 0,
    connect: 0,
    earnings: 0,
    accommodation: 0,
    wage: 0,
    warnings: [],
  };
  for (const r of rows) {
    totals.tie += r.breakdown.tie;
    totals.connect += r.breakdown.connect;
    totals.earnings += r.earnings;
    totals.accommodation += r.accommodation;
    totals.wage += r.wage;
    for (const w of r.warnings) {
      if (!totals.warnings.includes(w)) totals.warnings.push(w);
    }
  }
  return totals;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- wages`
Expected: PASS — all 19 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/portal/wages.ts lib/portal/wages.test.ts
git commit -m "feat: add sumWageRows helper for admin wage aggregations"
```

---

## Task 3: `WageDateFilter` shared client component

The three new admin pages all need an identical from/to filter that pushes the new values to the current route. Extract once.

**Files:**
- Create: `app/(app)/wages/WageDateFilter.tsx`

- [ ] **Step 1: Create `app/(app)/wages/WageDateFilter.tsx`**

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/**
 * Shared from/to filter used by every admin wage page. Reads the current
 * pathname so each page pushes back to its own route with updated search
 * params; the page server component re-runs and recomputes the ranged totals.
 * Optional `trailing` slot is rendered inline at the end of the filter row
 * (used by the project list page to host the Export CSV button next to the
 * Calculate button).
 */
export function WageDateFilter({
  from,
  to,
  trailing,
}: {
  from: string;
  to: string;
  trailing?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations("wages");
  const [f, setF] = useState(from);
  const [tt, setTt] = useState(to);

  function apply() {
    const params = new URLSearchParams(sp);
    params.set("from", f);
    params.set("to", tt);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end mb-4">
      <div className="w-full sm:w-auto">
        <label htmlFor="wage-from" className="text-xs text-muted block mb-1">
          {t("from")}
        </label>
        <input
          id="wage-from"
          type="date"
          value={f}
          onChange={(e) => setF(e.target.value)}
          className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
        />
      </div>
      <div className="w-full sm:w-auto">
        <label htmlFor="wage-to" className="text-xs text-muted block mb-1">
          {t("to")}
        </label>
        <input
          id="wage-to"
          type="date"
          value={tt}
          onChange={(e) => setTt(e.target.value)}
          className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
        />
      </div>
      <Button onClick={apply} variant="primary" className="w-full sm:w-auto">
        {t("calculate")}
      </Button>
      {trailing}
    </div>
  );
}
```

This reuses the existing `wages.from`, `wages.to`, `wages.calculate` i18n keys — no new keys.

- [ ] **Step 2: Confirm lint and build pass**

Run: `npm run lint`
Expected: 4 known pre-existing problems only (1 error `react-hooks/purity` in `TableLogger.tsx`, 3 unused-var warnings). No NEW problems from `WageDateFilter`.

Run: `npm run build`
Expected: build succeeds. (`WageDateFilter` is not imported yet, so it does not affect the existing pages.)

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/wages/WageDateFilter.tsx"
git commit -m "feat: shared WageDateFilter client component"
```

---

## Task 4: `AdminSectionWageView` component + section page

**Files:**
- Create: `app/(app)/wages/AdminSectionWageView.tsx`
- Create: `app/(app)/wages/projects/[projectId]/sections/[sectionId]/page.tsx`
- Modify: `messages/en.json`, `messages/sk.json`

- [ ] **Step 1: Add the i18n key for the all-time helper note**

In `messages/en.json`, inside the `"wages"` object, add:
```json
    "allTimeHelper": "All-time figures are primary. The range total is shown below in muted text.",
```
In `messages/sk.json`, inside the `"wages"` object, add:
```json
    "allTimeHelper": "Hlavná hodnota je celková za celé obdobie. Pod ňou je menšia hodnota za vybraný rozsah dátumov.",
```

- [ ] **Step 2: Create `app/(app)/wages/AdminSectionWageView.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { WageDateFilter } from "./WageDateFilter";

type SectionWorkerRow = {
  userId: string;
  name: string;
  allTime: { tie: number; connect: number; earnings: number; warnings: string[] };
  range: { tie: number; connect: number; earnings: number };
};

function NumCell({ allTime, range }: { allTime: number; range: number }) {
  return (
    <div>
      <div className="font-semibold text-navy">{allTime.toFixed(2)}</div>
      <div className="text-xs text-muted">{range.toFixed(2)}</div>
    </div>
  );
}

export function AdminSectionWageView({
  from,
  to,
  workers,
}: {
  from: string;
  to: string;
  workers: SectionWorkerRow[];
}) {
  const t = useTranslations("wages");
  const tCommon = useTranslations("common");

  const hasMissingPrice = workers.some((w) => w.allTime.warnings.includes("missing-price"));

  return (
    <>
      <WageDateFilter from={from} to={to} />
      <p className="text-xs text-muted mb-4">{t("allTimeHelper")}</p>

      {hasMissingPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      <DataTable
        headers={[tCommon("name"), t("tie"), t("connect"), t("earnings")]}
        empty={t("noData")}
        rows={workers.map((w) => [
          w.name,
          <NumCell key={`tie-${w.userId}`} allTime={w.allTime.tie} range={w.range.tie} />,
          <NumCell key={`con-${w.userId}`} allTime={w.allTime.connect} range={w.range.connect} />,
          <NumCell key={`ear-${w.userId}`} allTime={w.allTime.earnings} range={w.range.earnings} />,
        ])}
      />
    </>
  );
}
```

- [ ] **Step 3: Create `app/(app)/wages/projects/[projectId]/sections/[sectionId]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { computeWages } from "@/lib/portal/wages";
import { AdminSectionWageView } from "../../../AdminSectionWageView";

const ALL_TIME_FROM = new Date(0);
const ALL_TIME_TO = new Date(9999, 0, 1);

export default async function AdminSectionWagePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; sectionId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin();
  const { projectId, sectionId } = await params;
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = sp.from ?? today;
  const toStr = sp.to ?? today;
  const from = new Date(fromStr);
  const to = new Date(toStr);

  const [section, project, workers, prices, activity] = await Promise.all([
    prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true, name: true, projectId: true },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({ where: { projectId } }),
    prisma.activityLog.findMany({
      where: { table: { sectionId } },
      include: { projectWorker: true, table: { include: { section: true } } },
    }),
  ]);

  if (!section || !project) notFound();
  if (section.projectId !== projectId) notFound();

  const baseInput = {
    workers: workers.map((w) => ({ id: w.id, name: w.name })),
    prices: prices.map((p) => ({
      projectId: p.projectId,
      userId: p.userId,
      priceTie: Number(p.priceTie),
      priceConnect: Number(p.priceConnect),
    })),
    activity: activity.map((a) => ({
      userId: a.projectWorker.userId,
      projectId: a.table.section.projectId,
      sectionId: a.table.section.id,
      action: a.action,
      count: a.count,
      workDate: a.workDate,
    })),
    accommodations: [],
    projectId,
    sectionId,
  };

  const allTime = computeWages({ ...baseInput, from: ALL_TIME_FROM, to: ALL_TIME_TO });
  const ranged = computeWages({ ...baseInput, from, to });

  const allTimeById = new Map(allTime.rows.map((r) => [r.userId, r] as const));
  const rangedById = new Map(ranged.rows.map((r) => [r.userId, r] as const));

  const workerRows = workers
    .map((w) => {
      const at = allTimeById.get(w.id);
      const rg = rangedById.get(w.id);
      return {
        userId: w.id,
        name: w.name,
        allTime: {
          tie: at?.breakdown.tie ?? 0,
          connect: at?.breakdown.connect ?? 0,
          earnings: at?.earnings ?? 0,
          warnings: at?.warnings ?? [],
        },
        range: {
          tie: rg?.breakdown.tie ?? 0,
          connect: rg?.breakdown.connect ?? 0,
          earnings: rg?.earnings ?? 0,
        },
      };
    })
    .filter((r) => r.allTime.earnings !== 0);

  return (
    <div>
      <Link
        href={`/wages/projects/${project.id}?from=${fromStr}&to=${toStr}`}
        className="text-sm text-accent hover:underline"
      >
        ‹ {project.name}
      </Link>
      <h1 className="mt-2 mb-8 text-2xl font-semibold text-navy">{section.name}</h1>
      <AdminSectionWageView from={fromStr} to={toStr} workers={workerRows} />
    </div>
  );
}
```

- [ ] **Step 4: Confirm lint and build pass**

Run: `npm run lint`
Expected: 4 known pre-existing problems only. No new lint issues.

Run: `npm run build`
Expected: build succeeds; the new route `/wages/projects/[projectId]/sections/[sectionId]` appears in the route list (server-rendered on demand).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/wages/AdminSectionWageView.tsx" "app/(app)/wages/projects" messages/en.json messages/sk.json
git commit -m "feat: admin section wages page"
```

---

## Task 5: `AdminProjectWageView` component + project page

**Files:**
- Create: `app/(app)/wages/AdminProjectWageView.tsx`
- Create: `app/(app)/wages/projects/[projectId]/page.tsx`
- Modify: `messages/en.json`, `messages/sk.json`

- [ ] **Step 1: Add the i18n keys**

In `messages/en.json`, inside the `"wages"` object, add:
```json
    "sections": "Sections",
    "workersSummary": "Per-worker summary",
```
In `messages/sk.json`, inside the `"wages"` object, add:
```json
    "sections": "Sekcie",
    "workersSummary": "Súhrn po pracovníkoch",
```

- [ ] **Step 2: Create `app/(app)/wages/AdminProjectWageView.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { WageDateFilter } from "./WageDateFilter";

type SectionRow = {
  id: string;
  name: string;
  allTime: { tie: number; connect: number; earnings: number };
  range: { tie: number; connect: number; earnings: number };
};

type WorkerRow = {
  userId: string;
  name: string;
  allTime: { tie: number; connect: number; earnings: number; accommodation: number; wage: number; warnings: string[] };
  range: { tie: number; connect: number; earnings: number; accommodation: number; wage: number };
};

function NumCell({ allTime, range }: { allTime: number; range: number }) {
  return (
    <div>
      <div className="font-semibold text-navy">{allTime.toFixed(2)}</div>
      <div className="text-xs text-muted">{range.toFixed(2)}</div>
    </div>
  );
}

export function AdminProjectWageView({
  projectId,
  from,
  to,
  sections,
  workers,
  mixedCurrencies,
}: {
  projectId: string;
  from: string;
  to: string;
  sections: SectionRow[];
  workers: WorkerRow[];
  mixedCurrencies: boolean;
}) {
  const t = useTranslations("wages");
  const tProjects = useTranslations("projects");
  const tCommon = useTranslations("common");

  const hasMissingPrice = workers.some((w) => w.allTime.warnings.includes("missing-price"));

  return (
    <>
      <WageDateFilter from={from} to={to} />
      <p className="text-xs text-muted mb-4">{t("allTimeHelper")}</p>

      {mixedCurrencies && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("mixedCurrencies")}
        </p>
      )}
      {hasMissingPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      <h2 className="text-lg font-semibold text-navy mt-6 mb-3">{t("sections")}</h2>
      <DataTable
        headers={[tProjects("section"), t("tie"), t("connect"), t("earnings")]}
        empty={tProjects("noProjects")}
        rows={sections.map((s) => [
          <Link
            key={s.id}
            href={`/wages/projects/${projectId}/sections/${s.id}?from=${from}&to=${to}`}
            className="text-navy hover:underline"
          >
            {s.name}
          </Link>,
          <NumCell key={`tie-${s.id}`} allTime={s.allTime.tie} range={s.range.tie} />,
          <NumCell key={`con-${s.id}`} allTime={s.allTime.connect} range={s.range.connect} />,
          <NumCell key={`ear-${s.id}`} allTime={s.allTime.earnings} range={s.range.earnings} />,
        ])}
      />

      <h2 className="text-lg font-semibold text-navy mt-10 mb-3">{t("workersSummary")}</h2>
      <DataTable
        headers={[
          tCommon("name"),
          t("tie"),
          t("connect"),
          t("earnings"),
          t("accommodation"),
          t("wage"),
        ]}
        empty={t("noData")}
        rows={workers.map((w) => [
          w.name,
          <NumCell key={`tie-${w.userId}`} allTime={w.allTime.tie} range={w.range.tie} />,
          <NumCell key={`con-${w.userId}`} allTime={w.allTime.connect} range={w.range.connect} />,
          <NumCell key={`ear-${w.userId}`} allTime={w.allTime.earnings} range={w.range.earnings} />,
          <NumCell key={`acc-${w.userId}`} allTime={w.allTime.accommodation} range={w.range.accommodation} />,
          <NumCell key={`wag-${w.userId}`} allTime={w.allTime.wage} range={w.range.wage} />,
        ])}
      />
    </>
  );
}
```

- [ ] **Step 3: Create `app/(app)/wages/projects/[projectId]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { computeWages, sumWageRows } from "@/lib/portal/wages";
import { AdminProjectWageView } from "../../AdminProjectWageView";

const ALL_TIME_FROM = new Date(0);
const ALL_TIME_TO = new Date(9999, 0, 1);

export default async function AdminProjectWagePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin();
  const { projectId } = await params;
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = sp.from ?? today;
  const toStr = sp.to ?? today;
  const from = new Date(fromStr);
  const to = new Date(toStr);

  const [project, workers, prices, activity, accommodations] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: { orderBy: { orderIndex: "asc" }, select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({ where: { projectId } }),
    prisma.activityLog.findMany({
      where: { table: { section: { projectId } } },
      include: { projectWorker: true, table: { include: { section: true } } },
    }),
    prisma.accommodation.findMany({
      where: { projectId },
      include: { workers: true },
    }),
  ]);

  if (!project) notFound();

  const baseInput = {
    workers: workers.map((w) => ({ id: w.id, name: w.name })),
    prices: prices.map((p) => ({
      projectId: p.projectId,
      userId: p.userId,
      priceTie: Number(p.priceTie),
      priceConnect: Number(p.priceConnect),
    })),
    activity: activity.map((a) => ({
      userId: a.projectWorker.userId,
      projectId: a.table.section.projectId,
      sectionId: a.table.section.id,
      action: a.action,
      count: a.count,
      workDate: a.workDate,
    })),
    accommodations: accommodations.map((acc) => ({
      id: acc.id,
      totalCost: Number(acc.totalCost),
      currency: acc.currency,
      startDate: acc.startDate,
      endDate: acc.endDate,
      workerIds: acc.workers.map((w) => w.userId),
      projectId: acc.projectId,
    })),
    projectId,
  };

  // Per-worker summary for the project (no section filter; accommodation in).
  const projectAllTime = computeWages({ ...baseInput, from: ALL_TIME_FROM, to: ALL_TIME_TO });
  const projectRanged = computeWages({ ...baseInput, from, to });

  const allTimeById = new Map(projectAllTime.rows.map((r) => [r.userId, r] as const));
  const rangedById = new Map(projectRanged.rows.map((r) => [r.userId, r] as const));
  const workerRows = workers
    .map((w) => {
      const at = allTimeById.get(w.id);
      const rg = rangedById.get(w.id);
      return {
        userId: w.id,
        name: w.name,
        allTime: {
          tie: at?.breakdown.tie ?? 0,
          connect: at?.breakdown.connect ?? 0,
          earnings: at?.earnings ?? 0,
          accommodation: at?.accommodation ?? 0,
          wage: at?.wage ?? 0,
          warnings: at?.warnings ?? [],
        },
        range: {
          tie: rg?.breakdown.tie ?? 0,
          connect: rg?.breakdown.connect ?? 0,
          earnings: rg?.earnings ?? 0,
          accommodation: rg?.accommodation ?? 0,
          wage: rg?.wage ?? 0,
        },
      };
    })
    .filter((r) => r.allTime.earnings !== 0 || r.allTime.accommodation !== 0);

  // Per-section totals (sum across all workers, no accommodation).
  const sectionRows = project.sections.map((section) => {
    const at = sumWageRows(
      computeWages({ ...baseInput, sectionId: section.id, from: ALL_TIME_FROM, to: ALL_TIME_TO }).rows,
    );
    const rg = sumWageRows(
      computeWages({ ...baseInput, sectionId: section.id, from, to }).rows,
    );
    return {
      id: section.id,
      name: section.name,
      allTime: { tie: at.tie, connect: at.connect, earnings: at.earnings },
      range: { tie: rg.tie, connect: rg.connect, earnings: rg.earnings },
    };
  });

  return (
    <div>
      <Link
        href={`/wages?from=${fromStr}&to=${toStr}`}
        className="text-sm text-accent hover:underline"
      >
        ‹ Wages
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-navy">{project.name}</h1>
      {project.location && (
        <p className="text-sm text-muted mb-8">{project.location}</p>
      )}
      {!project.location && <div className="mb-8" />}
      <AdminProjectWageView
        projectId={project.id}
        from={fromStr}
        to={toStr}
        sections={sectionRows}
        workers={workerRows}
        mixedCurrencies={projectAllTime.mixedCurrencies}
      />
    </div>
  );
}
```

- [ ] **Step 4: Confirm lint and build pass**

Run: `npm run lint`
Expected: 4 known pre-existing problems only.

Run: `npm run build`
Expected: build succeeds; new route `/wages/projects/[projectId]` appears.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/wages/AdminProjectWageView.tsx" "app/(app)/wages/projects/[projectId]/page.tsx" messages/en.json messages/sk.json
git commit -m "feat: admin project wages page (sections + per-worker summary)"
```

---

## Task 6: `AdminProjectList` component

**Files:**
- Create: `app/(app)/wages/AdminProjectList.tsx`

- [ ] **Step 1: Create `app/(app)/wages/AdminProjectList.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { Button } from "@/components/ui/Button";
import { WageDateFilter } from "./WageDateFilter";

type ProjectRow = {
  id: string;
  name: string;
  location: string | null;
  status: "ACTIVE" | "CLOSED";
  allTime: { tie: number; connect: number; earnings: number; accommodation: number; wage: number; warnings: string[] };
  range: { tie: number; connect: number; earnings: number; accommodation: number; wage: number };
};

function NumCell({ allTime, range }: { allTime: number; range: number }) {
  return (
    <div>
      <div className="font-semibold text-navy">{allTime.toFixed(2)}</div>
      <div className="text-xs text-muted">{range.toFixed(2)}</div>
    </div>
  );
}

export function AdminProjectList({
  from,
  to,
  projects,
  mixedCurrencies,
}: {
  from: string;
  to: string;
  projects: ProjectRow[];
  mixedCurrencies: boolean;
}) {
  const sp = useSearchParams();
  const t = useTranslations("wages");
  const tProjects = useTranslations("projects");
  const tCommon = useTranslations("common");

  function exportCsv() {
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    const projectId = sp.get("projectId");
    if (projectId) params.set("projectId", projectId);
    window.location.href = `/wages/export.csv?${params.toString()}`;
  }

  const hasMissingPrice = projects.some((p) => p.allTime.warnings.includes("missing-price"));

  return (
    <>
      <WageDateFilter
        from={from}
        to={to}
        trailing={
          <Button onClick={exportCsv} variant="secondary" className="w-full sm:w-auto">
            {t("exportCsv")}
          </Button>
        }
      />
      <p className="text-xs text-muted mb-4">{t("allTimeHelper")}</p>

      {mixedCurrencies && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("mixedCurrencies")}
        </p>
      )}
      {hasMissingPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      <DataTable
        headers={[
          tProjects("name"),
          tProjects("location"),
          tCommon("status"),
          t("tie"),
          t("connect"),
          t("accommodation"),
          t("wage"),
        ]}
        empty={tProjects("noProjects")}
        rows={projects.map((p) => [
          <Link
            key={p.id}
            href={`/wages/projects/${p.id}?from=${from}&to=${to}`}
            className="text-navy font-medium hover:underline"
          >
            {p.name}
          </Link>,
          p.location ?? "",
          p.status === "ACTIVE" ? tCommon("active") : tCommon("closed"),
          <NumCell key={`tie-${p.id}`} allTime={p.allTime.tie} range={p.range.tie} />,
          <NumCell key={`con-${p.id}`} allTime={p.allTime.connect} range={p.range.connect} />,
          <NumCell key={`acc-${p.id}`} allTime={p.allTime.accommodation} range={p.range.accommodation} />,
          <NumCell key={`wag-${p.id}`} allTime={p.allTime.wage} range={p.range.wage} />,
        ])}
      />
    </>
  );
}
```

- [ ] **Step 2: Confirm lint and build pass**

Run: `npm run lint`
Expected: 4 known pre-existing problems only.

Run: `npm run build`
Expected: build succeeds. (`AdminProjectList` is not imported yet — wired up in Task 7.)

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/wages/AdminProjectList.tsx"
git commit -m "feat: AdminProjectList component for admin wages drill-down"
```

---

## Task 7: Wire `/wages` admin branch + remove `WagesView`

**Files:**
- Modify: `app/(app)/wages/page.tsx`
- Delete: `app/(app)/wages/WagesView.tsx`

- [ ] **Step 1: Rewrite the admin branch of `app/(app)/wages/page.tsx`**

Replace the entire contents of `app/(app)/wages/page.tsx` with:
```tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { getTranslations } from "next-intl/server";
import { computeWages, computeWagesByProject, sumWageRows } from "@/lib/portal/wages";
import { withWorkerScope } from "@/lib/prisma-worker";
import { MyWagesView } from "./MyWagesView";
import { AdminProjectList } from "./AdminProjectList";

const ALL_TIME_FROM = new Date(0);
const ALL_TIME_TO = new Date(9999, 0, 1);

export default async function WagesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; projectId?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = sp.from ?? today;
  const toStr = sp.to ?? today;
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const t = await getTranslations("wages");

  // Worker: only their own wages, read through the RLS-enforced connection.
  if (user.role !== "ADMIN") {
    const data = await withWorkerScope(user.id, async (tx) => {
      const [prices, activity, accommodations, projects] = await Promise.all([
        tx.projectWorker.findMany(),
        tx.activityLog.findMany({
          where: { workDate: { gte: from, lte: to } },
          include: { projectWorker: true, table: { include: { section: true } } },
        }),
        tx.accommodation.findMany({
          where: { startDate: { lte: to }, endDate: { gte: from } },
          include: { workers: true },
        }),
        tx.project.findMany({ orderBy: { createdAt: "desc" } }),
      ]);
      return { prices, activity, accommodations, projects };
    });

    const result = computeWagesByProject({
      from,
      to,
      projectId: null,
      workers: [{ id: user.id, name: user.name ?? "" }],
      projects: data.projects.map((p) => ({ id: p.id, name: p.name })),
      prices: data.prices.map((p) => ({
        projectId: p.projectId,
        userId: p.userId,
        priceTie: Number(p.priceTie),
        priceConnect: Number(p.priceConnect),
      })),
      activity: data.activity.map((a) => ({
        userId: a.projectWorker.userId,
        projectId: a.table.section.projectId,
        action: a.action,
        count: a.count,
        workDate: a.workDate,
      })),
      accommodations: data.accommodations.map((acc) => ({
        id: acc.id,
        totalCost: Number(acc.totalCost),
        currency: acc.currency,
        startDate: acc.startDate,
        endDate: acc.endDate,
        workerIds: acc.workers.map((w) => w.userId),
        projectId: acc.projectId,
      })),
    });

    return (
      <div>
        <h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>
        <MyWagesView from={fromStr} to={toStr} result={result} />
      </div>
    );
  }

  // Admin: project drill-down. Fetch all data once, compute per-project
  // all-time and ranged totals from the same input.
  const [projects, workers, prices, activity, accommodations] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({}),
    prisma.activityLog.findMany({
      include: { projectWorker: true, table: { include: { section: true } } },
    }),
    prisma.accommodation.findMany({ include: { workers: true } }),
  ]);

  const baseInput = {
    workers: workers.map((w) => ({ id: w.id, name: w.name })),
    prices: prices.map((p) => ({
      projectId: p.projectId,
      userId: p.userId,
      priceTie: Number(p.priceTie),
      priceConnect: Number(p.priceConnect),
    })),
    activity: activity.map((a) => ({
      userId: a.projectWorker.userId,
      projectId: a.table.section.projectId,
      sectionId: a.table.section.id,
      action: a.action,
      count: a.count,
      workDate: a.workDate,
    })),
    accommodations: accommodations.map((acc) => ({
      id: acc.id,
      totalCost: Number(acc.totalCost),
      currency: acc.currency,
      startDate: acc.startDate,
      endDate: acc.endDate,
      workerIds: acc.workers.map((w) => w.userId),
      projectId: acc.projectId,
    })),
  };

  let anyMixed = false;
  const projectRows = projects.map((p) => {
    const at = computeWages({ ...baseInput, projectId: p.id, from: ALL_TIME_FROM, to: ALL_TIME_TO });
    const rg = computeWages({ ...baseInput, projectId: p.id, from, to });
    if (at.mixedCurrencies || rg.mixedCurrencies) anyMixed = true;
    const atT = sumWageRows(at.rows);
    const rgT = sumWageRows(rg.rows);
    return {
      id: p.id,
      name: p.name,
      location: p.location,
      status: p.status,
      allTime: {
        tie: atT.tie,
        connect: atT.connect,
        earnings: atT.earnings,
        accommodation: atT.accommodation,
        wage: atT.wage,
        warnings: atT.warnings,
      },
      range: {
        tie: rgT.tie,
        connect: rgT.connect,
        earnings: rgT.earnings,
        accommodation: rgT.accommodation,
        wage: rgT.wage,
      },
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>
      <AdminProjectList
        from={fromStr}
        to={toStr}
        projects={projectRows}
        mixedCurrencies={anyMixed}
      />
    </div>
  );
}
```

- [ ] **Step 2: Delete `app/(app)/wages/WagesView.tsx`**

```bash
git rm "app/(app)/wages/WagesView.tsx"
```

- [ ] **Step 3: Confirm lint and build pass**

Run: `npm run lint`
Expected: 4 known pre-existing problems only — no new ones, and the removed `WagesView` is no longer referenced anywhere.

Run: `npm run build`
Expected: build succeeds; the admin `/wages` route renders `AdminProjectList`, the new `/wages/projects/[projectId]` and `/wages/projects/[projectId]/sections/[sectionId]` routes appear, and `/wages/export.csv` is unaffected.

- [ ] **Step 4: Verify worker `/wages` still works (no regression)**

Run:
```bash
node --env-file=.env.local -e "import('pg').then(async ({default: pg}) => { const c = new pg.Client({ connectionString: process.env.DATABASE_URL_WORKER }); await c.connect(); const r = await c.query('SELECT count(*)::int AS n FROM \"ProjectWorker\"'); console.log({ worker_no_context: r.rows[0].n }); await c.end(); });"
```
Expected: `{ worker_no_context: 0 }` — the RLS-enforced worker connection still denies-by-default. The worker page path through `withWorkerScope` is unchanged by this task.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/wages/page.tsx"
git commit -m "feat: admin /wages renders project drill-down list"
```

(The `git rm` from Step 2 is included in this commit by default since `git rm` stages the removal.)

---

## Final Verification

- [ ] **Run the full test suite**

Run: `npm test`
Expected: all suites pass, including the new `computeWages sectionId filter` and `sumWageRows` tests.

- [ ] **Lint and build**

Run: `npm run lint && npm run build`
Expected: build succeeds. Lint shows only the 4 known pre-existing problems.

- [ ] **Manual smoke check (deferred to human)**

Log in as admin and:

1. Open `/wages` — see one row per project, all-time figures prominent, range figures muted underneath.
2. Click a project — see the sections panel and per-worker summary, both with all-time and range numbers.
3. Click a section — see per-worker tie/connect/earnings for that section.
4. Click "Export CSV" — downloads the existing per-worker date-range CSV (unchanged).
5. Change from/to dates and Calculate — range figures update at every level.
6. Log in as a worker — `/wages` still shows the worker-only `MyWagesView` (unchanged).

---

## Coverage Check

| Spec section | Plan tasks |
|---|---|
| A. `/wages` project list | Tasks 6 (component) + 7 (wiring) |
| B. `/wages/projects/[id]` | Task 5 |
| C. `/wages/projects/[id]/sections/[sid]` | Task 4 |
| D. Additive `sectionId` filter on `computeWages` | Task 1 |
| Shared date filter | Task 3 |
| Summing helper | Task 2 |
| Remove `WagesView.tsx` | Task 7 |

## Out of Scope (per spec)

- Worker `/wages` view, RLS layer, `lib/prisma-worker.ts`, `qs_worker` role — all untouched.
- `wages/export.csv/route.ts` — keeps its existing per-worker date-range CSV shape.
- Per-section accommodation allocation.
- SQL aggregation / caching for the project list.
