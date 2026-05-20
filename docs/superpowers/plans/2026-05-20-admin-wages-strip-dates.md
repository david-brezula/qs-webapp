# Strip Dates from Admin Wages Drill-Down — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the date-range filter, the all-time/range dual display, the helper text, and the Export CSV button from the three admin wages pages. Each numeric cell becomes a single all-time number. The drill-down structure and column lists at every level are unchanged.

**Architecture:** Each admin page issues exactly ONE `computeWages` call per scope (with `from = ALL_TIME_FROM`, `to = ALL_TIME_TO`). The presentational components drop their `from`/`to` props and the `WageDateFilter` is deleted (no consumers remain — the worker `MyWagesView` uses its own inline filter). `lib/portal/wages.ts` is untouched.

**Tech Stack:** Next.js 16 (App Router, server + client components), Prisma 7, next-intl v4, Tailwind. Existing `lib/portal/wages.ts` helpers (`computeWages`, `sumWageRows`, `ALL_TIME_FROM`, `ALL_TIME_TO`) are reused as-is.

**Project note:** This is a customised Next.js — per `AGENTS.md`, consult `node_modules/next/dist/docs/` before using unfamiliar Next APIs. This plan only edits existing patterns (server components, client components, `Link`, `notFound`, `getTranslations`).

**Spec:** `docs/superpowers/specs/2026-05-20-admin-wages-strip-dates-design.md`

---

## File Structure

**Modified**

- `app/(app)/wages/AdminSectionWageView.tsx` — drop `from`/`to` props, `WageDateFilter`, helper paragraph; flatten the worker row type; `NumCell` collapses to one value.
- `app/(app)/wages/projects/[projectId]/sections/[sectionId]/page.tsx` — drop `searchParams` + ranged `computeWages` call; one all-time call; back link no longer carries `?from=&to=`.
- `app/(app)/wages/AdminProjectWageView.tsx` — same simplification; section row link drops `?from=&to=`.
- `app/(app)/wages/projects/[projectId]/page.tsx` — drop `searchParams` + ranged calls; one all-time call per project + one per section; back link no longer carries `?from=&to=`.
- `app/(app)/wages/AdminProjectList.tsx` — same simplification; project link drops `?from=&to=`; Export CSV button removed.
- `app/(app)/wages/page.tsx` — admin branch: drop ranged computation + range fields; worker branch unchanged.
- `messages/en.json`, `messages/sk.json` — add `wages.noActivityYet`; remove `wages.allTimeHelper` and `wages.exportCsv`.

**Removed**

- `app/(app)/wages/WageDateFilter.tsx` — no consumers after the changes above. The worker `MyWagesView` uses its own inline filter; this shared component was admin-only.

**Untouched**

- `lib/portal/wages.ts` and `lib/portal/wages.test.ts` — all exports stay (`computeWages`, `computeWagesByProject`, `sumWageRows`, `ALL_TIME_FROM`, `ALL_TIME_TO`). Each is still used.
- `app/(app)/wages/MyWagesView.tsx` — worker view keeps its date filter.
- `app/(app)/wages/export.csv/route.ts` — CSV route handler untouched; just no UI button.
- `lib/prisma-worker.ts`, RLS migrations, `qs_worker` role.
- `proxy.ts` — already covers `/wages/...` paths.

**Known pre-existing lint state**

The repo has 1 known lint error (`react-hooks/purity` in `app/(app)/projects/[projectId]/log/TableLogger.tsx:397`) and 3 unused-var warnings unrelated to this feature. Every UI task below runs `npm run lint` and `npm run build` as **separate commands** and passes if no NEW lint problems are introduced and the build succeeds.

---

## Task 1: Add `wages.noActivityYet` i18n key

The existing `wages.noData` reads "No activity in this range." — accurate for the worker view (which keeps a date filter) but awkward on admin pages after the dates go away. Add a new key for the admin pages; leave `wages.noData` for `MyWagesView`.

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/sk.json`

- [ ] **Step 1: Add the key to both locale files**

In `messages/en.json`, inside the `"wages"` object, add:
```json
    "noActivityYet": "No activity yet.",
```

In `messages/sk.json`, inside the `"wages"` object, add:
```json
    "noActivityYet": "Zatiaľ žiadna aktivita.",
```

- [ ] **Step 2: Confirm both JSON files are still valid and the build still passes**

Run: `npm run build`
Expected: build succeeds. (No code references the key yet — subsequent tasks will switch over.)

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/sk.json
git commit -m "feat: add wages.noActivityYet i18n key"
```

---

## Task 2: Strip dates from `AdminSectionWageView` + section page

**Files:**
- Modify: `app/(app)/wages/AdminSectionWageView.tsx`
- Modify: `app/(app)/wages/projects/[projectId]/sections/[sectionId]/page.tsx`

- [ ] **Step 1: Replace the entire contents of `AdminSectionWageView.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";

type SectionWorkerRow = {
  userId: string;
  name: string;
  tie: number;
  connect: number;
  earnings: number;
  warnings: string[];
};

function NumCell({ value }: { value: number }) {
  return <div className="font-semibold text-navy">{value.toFixed(2)}</div>;
}

export function AdminSectionWageView({ workers }: { workers: SectionWorkerRow[] }) {
  const t = useTranslations("wages");
  const tCommon = useTranslations("common");

  const hasMissingPrice = workers.some((w) => w.warnings.includes("missing-price"));

  return (
    <>
      {hasMissingPrice && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("missingPrice")}
        </p>
      )}

      <DataTable
        headers={[tCommon("name"), t("tie"), t("connect"), t("earnings")]}
        empty={t("noActivityYet")}
        rows={workers.map((w) => [
          w.name,
          <NumCell key={`tie-${w.userId}`} value={w.tie} />,
          <NumCell key={`con-${w.userId}`} value={w.connect} />,
          <NumCell key={`ear-${w.userId}`} value={w.earnings} />,
        ])}
      />
    </>
  );
}
```

- [ ] **Step 2: Replace the entire contents of `app/(app)/wages/projects/[projectId]/sections/[sectionId]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { ALL_TIME_FROM, ALL_TIME_TO, computeWages } from "@/lib/portal/wages";
import { AdminSectionWageView } from "../../../../AdminSectionWageView";

export default async function AdminSectionWagePage({
  params,
}: {
  params: Promise<{ projectId: string; sectionId: string }>;
}) {
  await requireAdmin();
  const { projectId, sectionId } = await params;

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
      include: { projectWorker: true },
    }),
  ]);

  if (!section || !project) notFound();
  if (section.projectId !== projectId) notFound();

  const result = computeWages({
    from: ALL_TIME_FROM,
    to: ALL_TIME_TO,
    projectId,
    sectionId,
    workers: workers.map((w) => ({ id: w.id, name: w.name })),
    prices: prices.map((p) => ({
      projectId: p.projectId,
      userId: p.userId,
      priceTie: Number(p.priceTie),
      priceConnect: Number(p.priceConnect),
    })),
    activity: activity.map((a) => ({
      userId: a.projectWorker.userId,
      projectId,
      sectionId,
      action: a.action,
      count: a.count,
      workDate: a.workDate,
    })),
    accommodations: [],
  });

  const workerRows = result.rows
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      tie: r.breakdown.tie,
      connect: r.breakdown.connect,
      earnings: r.earnings,
      warnings: r.warnings,
    }))
    .filter((r) => r.earnings !== 0);

  return (
    <div>
      <Link
        href={`/wages/projects/${project.id}`}
        className="text-sm text-accent hover:underline"
      >
        ‹ {project.name}
      </Link>
      <h1 className="mt-2 mb-8 text-2xl font-semibold text-navy">{section.name}</h1>
      <AdminSectionWageView workers={workerRows} />
    </div>
  );
}
```

- [ ] **Step 3: Confirm lint and build pass**

Run: `npm run lint`
Expected: 4 known pre-existing problems only.

Run: `npm run build`
Expected: build succeeds. `/wages/projects/[projectId]/sections/[sectionId]` route still present.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/wages/AdminSectionWageView.tsx" "app/(app)/wages/projects/[projectId]/sections/[sectionId]/page.tsx"
git commit -m "refactor: strip date filter from admin section wages page"
```

---

## Task 3: Strip dates from `AdminProjectWageView` + project page

**Files:**
- Modify: `app/(app)/wages/AdminProjectWageView.tsx`
- Modify: `app/(app)/wages/projects/[projectId]/page.tsx`

- [ ] **Step 1: Replace the entire contents of `AdminProjectWageView.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";

type SectionRow = {
  id: string;
  name: string;
  tie: number;
  connect: number;
  earnings: number;
};

type WorkerRow = {
  userId: string;
  name: string;
  tie: number;
  connect: number;
  earnings: number;
  accommodation: number;
  wage: number;
  warnings: string[];
};

function NumCell({ value }: { value: number }) {
  return <div className="font-semibold text-navy">{value.toFixed(2)}</div>;
}

export function AdminProjectWageView({
  projectId,
  sections,
  workers,
  mixedCurrencies,
}: {
  projectId: string;
  sections: SectionRow[];
  workers: WorkerRow[];
  mixedCurrencies: boolean;
}) {
  const t = useTranslations("wages");
  const tProjects = useTranslations("projects");
  const tCommon = useTranslations("common");

  const hasMissingPrice = workers.some((w) => w.warnings.includes("missing-price"));

  return (
    <>
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
        empty={t("noSections")}
        rows={sections.map((s) => [
          <Link
            key={s.id}
            href={`/wages/projects/${projectId}/sections/${s.id}`}
            className="text-navy hover:underline"
          >
            {s.name}
          </Link>,
          <NumCell key={`tie-${s.id}`} value={s.tie} />,
          <NumCell key={`con-${s.id}`} value={s.connect} />,
          <NumCell key={`ear-${s.id}`} value={s.earnings} />,
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
        empty={t("noActivityYet")}
        rows={workers.map((w) => [
          w.name,
          <NumCell key={`tie-${w.userId}`} value={w.tie} />,
          <NumCell key={`con-${w.userId}`} value={w.connect} />,
          <NumCell key={`ear-${w.userId}`} value={w.earnings} />,
          <NumCell key={`acc-${w.userId}`} value={w.accommodation} />,
          <NumCell key={`wag-${w.userId}`} value={w.wage} />,
        ])}
      />
    </>
  );
}
```

- [ ] **Step 2: Replace the entire contents of `app/(app)/wages/projects/[projectId]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { ALL_TIME_FROM, ALL_TIME_TO, computeWages, sumWageRows } from "@/lib/portal/wages";
import { AdminProjectWageView } from "../../AdminProjectWageView";

export default async function AdminProjectWagePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireAdmin();
  const { projectId } = await params;
  const t = await getTranslations("wages");

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
      include: { projectWorker: true, table: true },
    }),
    prisma.accommodation.findMany({
      where: { projectId },
      include: { workers: true },
    }),
  ]);

  if (!project) notFound();

  const baseInput = {
    from: ALL_TIME_FROM,
    to: ALL_TIME_TO,
    workers: workers.map((w) => ({ id: w.id, name: w.name })),
    prices: prices.map((p) => ({
      projectId: p.projectId,
      userId: p.userId,
      priceTie: Number(p.priceTie),
      priceConnect: Number(p.priceConnect),
    })),
    activity: activity.map((a) => ({
      userId: a.projectWorker.userId,
      projectId,
      sectionId: a.table.sectionId,
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
  const projectResult = computeWages(baseInput);

  const workerRows = projectResult.rows
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      tie: r.breakdown.tie,
      connect: r.breakdown.connect,
      earnings: r.earnings,
      accommodation: r.accommodation,
      wage: r.wage,
      warnings: r.warnings,
    }))
    .filter((r) => r.earnings !== 0 || r.accommodation !== 0);

  // Per-section totals (sum across all workers, no accommodation). Each
  // section runs one full scan of the activity array; acceptable at current
  // scale, pre-group by sectionId if sections grow.
  const sectionRows = project.sections.map((section) => {
    const totals = sumWageRows(computeWages({ ...baseInput, sectionId: section.id }).rows);
    return {
      id: section.id,
      name: section.name,
      tie: totals.tie,
      connect: totals.connect,
      earnings: totals.earnings,
    };
  });

  return (
    <div>
      <Link href="/wages" className="text-sm text-accent hover:underline">
        ‹ {t("title")}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-navy">{project.name}</h1>
      {project.location && (
        <p className="text-sm text-muted mb-8">{project.location}</p>
      )}
      {!project.location && <div className="mb-8" />}
      <AdminProjectWageView
        projectId={project.id}
        sections={sectionRows}
        workers={workerRows}
        mixedCurrencies={projectResult.mixedCurrencies}
      />
    </div>
  );
}
```

- [ ] **Step 3: Confirm lint and build pass**

Run: `npm run lint`
Expected: 4 known pre-existing problems only.

Run: `npm run build`
Expected: build succeeds. `/wages/projects/[projectId]` route still present.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/wages/AdminProjectWageView.tsx" "app/(app)/wages/projects/[projectId]/page.tsx"
git commit -m "refactor: strip date filter from admin project wages page"
```

---

## Task 4: Strip dates from `AdminProjectList` + admin `/wages` page

**Files:**
- Modify: `app/(app)/wages/AdminProjectList.tsx`
- Modify: `app/(app)/wages/page.tsx` (admin branch only — worker branch unchanged)

- [ ] **Step 1: Replace the entire contents of `AdminProjectList.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";

type ProjectRow = {
  id: string;
  name: string;
  location: string | null;
  status: "ACTIVE" | "CLOSED";
  tie: number;
  connect: number;
  accommodation: number;
  wage: number;
  warnings: string[];
};

function NumCell({ value }: { value: number }) {
  return <div className="font-semibold text-navy">{value.toFixed(2)}</div>;
}

export function AdminProjectList({
  projects,
  mixedCurrencies,
}: {
  projects: ProjectRow[];
  mixedCurrencies: boolean;
}) {
  const t = useTranslations("wages");
  const tProjects = useTranslations("projects");
  const tCommon = useTranslations("common");

  const hasMissingPrice = projects.some((p) => p.warnings.includes("missing-price"));

  return (
    <>
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
            href={`/wages/projects/${p.id}`}
            className="text-navy font-medium hover:underline"
          >
            {p.name}
          </Link>,
          p.location ?? "",
          p.status === "ACTIVE" ? tCommon("active") : tCommon("closed"),
          <NumCell key={`tie-${p.id}`} value={p.tie} />,
          <NumCell key={`con-${p.id}`} value={p.connect} />,
          <NumCell key={`acc-${p.id}`} value={p.accommodation} />,
          <NumCell key={`wag-${p.id}`} value={p.wage} />,
        ])}
      />
    </>
  );
}
```

- [ ] **Step 2: Replace the entire contents of `app/(app)/wages/page.tsx`**

The worker branch is byte-for-byte identical to today's master state. The admin branch is rewritten to drop the ranged computation and the range fields.

```tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { getTranslations } from "next-intl/server";
import {
  ALL_TIME_FROM,
  ALL_TIME_TO,
  computeWages,
  computeWagesByProject,
  sumWageRows,
} from "@/lib/portal/wages";
import { withWorkerScope } from "@/lib/prisma-worker";
import { MyWagesView } from "./MyWagesView";
import { AdminProjectList } from "./AdminProjectList";

export default async function WagesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; projectId?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const t = await getTranslations("wages");

  // Worker: only their own wages, read through the RLS-enforced connection.
  if (user.role !== "ADMIN") {
    const today = new Date().toISOString().slice(0, 10);
    const fromStr = sp.from ?? today;
    const toStr = sp.to ?? today;
    const from = new Date(fromStr);
    const to = new Date(toStr);

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

  // Admin: project drill-down (all-time only).
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
    from: ALL_TIME_FROM,
    to: ALL_TIME_TO,
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

  const projectComputations = projects.map((p) => ({
    project: p,
    result: computeWages({ ...baseInput, projectId: p.id }),
  }));

  const anyMixed = projectComputations.some(({ result }) => result.mixedCurrencies);

  const projectRows = projectComputations.map(({ project, result }) => {
    const totals = sumWageRows(result.rows);
    return {
      id: project.id,
      name: project.name,
      location: project.location,
      status: project.status,
      tie: totals.tie,
      connect: totals.connect,
      accommodation: totals.accommodation,
      wage: totals.wage,
      warnings: totals.warnings,
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>
      <AdminProjectList projects={projectRows} mixedCurrencies={anyMixed} />
    </div>
  );
}
```

- [ ] **Step 3: Confirm lint and build pass**

Run: `npm run lint`
Expected: 4 known pre-existing problems only.

Run: `npm run build`
Expected: build succeeds. All four wage routes still present (`/wages`, `/wages/export.csv`, `/wages/projects/[projectId]`, `/wages/projects/[projectId]/sections/[sectionId]`).

- [ ] **Step 4: Verify worker `/wages` still works (no regression)**

Run:
```bash
node --env-file=.env.local scripts/verify-rls.mjs
```
Expected: `PASS: RLS isolates worker ... -- N own rows, 0 leaked, 0 without context.`

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/wages/AdminProjectList.tsx" "app/(app)/wages/page.tsx"
git commit -m "refactor: strip date filter from admin /wages project list"
```

---

## Task 5: Delete `WageDateFilter.tsx` + remove orphaned i18n keys

After Task 4, no file imports `WageDateFilter` and no string in the admin pages references `wages.allTimeHelper` or `wages.exportCsv`. Clean them up.

**Files:**
- Delete: `app/(app)/wages/WageDateFilter.tsx`
- Modify: `messages/en.json`
- Modify: `messages/sk.json`

- [ ] **Step 1: Confirm no remaining consumers of `WageDateFilter` or the orphaned keys**

Run:
```bash
grep -r "WageDateFilter" app lib components
grep -r "allTimeHelper" app lib components
grep -r "exportCsv" app lib components
```
Expected: all three grep commands print nothing.

(If any consumer is found, STOP and report — a stale reference would break the build after the delete.)

- [ ] **Step 2: Delete `WageDateFilter.tsx`**

```bash
git rm "app/(app)/wages/WageDateFilter.tsx"
```

- [ ] **Step 3: Remove the orphaned i18n keys**

In `messages/en.json`, inside the `"wages"` object, remove these two lines:
```json
    "allTimeHelper": "All-time figures are primary. The range total is shown below in muted text.",
    "exportCsv": "Export CSV",
```

(Mind the trailing commas — if either key is the last entry in the `wages` object, adjust the comma on the preceding line accordingly so the JSON remains valid.)

In `messages/sk.json`, inside the `"wages"` object, remove these two lines:
```json
    "allTimeHelper": "Hlavná hodnota je celková za celé obdobie. Pod ňou je menšia hodnota za vybraný rozsah dátumov.",
    "exportCsv": "Exportovať CSV",
```

(Same JSON-validity caveat as above.)

- [ ] **Step 4: Confirm both JSON files are still valid**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('messages/en.json'));JSON.parse(require('fs').readFileSync('messages/sk.json'));console.log('JSON OK')"
```
Expected: `JSON OK`.

- [ ] **Step 5: Confirm lint and build pass**

Run: `npm run lint`
Expected: 4 known pre-existing problems only.

Run: `npm run build`
Expected: build succeeds; no warning about missing i18n keys (next-intl is non-strict about missing keys at build time, but since no code references the removed keys, none will be missed at runtime either).

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/sk.json
git commit -m "chore: drop WageDateFilter and orphaned wage i18n keys"
```

(The `git rm` from Step 2 is included in this commit automatically since `git rm` stages the removal.)

---

## Final Verification

- [ ] **Run the full test suite**

Run: `npm test`
Expected: 49/49 tests pass (the pure helpers and existing tests are untouched).

- [ ] **Lint and build**

Run: `npm run lint && npm run build`
Expected: build succeeds; lint shows only the 4 known pre-existing problems.

- [ ] **RLS isolation still holds**

Run: `node --env-file=.env.local scripts/verify-rls.mjs`
Expected: `PASS: RLS isolates worker ... -- N own rows, 0 leaked, 0 without context.`

- [ ] **Manual smoke check (deferred to human)**

Log in as admin and:
1. Open `/wages` — no date filter, no helper text, no Export CSV button; project rows show a single number per cell.
2. Click a project — back link `‹ Wages` (or `‹ Mzdy`); sections panel + per-worker summary; one number per cell.
3. Click a section — back link `‹ {project name}`; per-worker rows; one number per cell.
4. Log in as a worker — `/wages` still shows `MyWagesView` with its date filter (unchanged).

---

## Coverage Check

| Spec section | Plan tasks |
|---|---|
| `/wages` (admin project list) without filter/helper/Export | Task 4 (component + wiring) |
| `/wages/projects/[id]` (project page) without filter/helper | Task 3 |
| `/wages/projects/[id]/sections/[sid]` (section page) without filter/helper | Task 2 |
| One `computeWages` per scope (all-time only) | Tasks 2, 3, 4 |
| URL `?from=&to=` ignored on all admin routes | Tasks 2, 3, 4 (back-link / row-link queries dropped; page no longer reads `searchParams.from`/`to`) |
| Delete `WageDateFilter.tsx` | Task 5 |
| Remove `wages.allTimeHelper` and `wages.exportCsv`; add `wages.noActivityYet` | Tasks 1 + 5 |
| Worker view untouched | Task 4 admin branch only |
| `lib/portal/wages.ts` untouched | All tasks reuse existing exports without modifying them |
| `/wages/export.csv` route untouched | All tasks |

## Out of Scope (per spec)

- Worker `/wages` view (`MyWagesView`) — keeps its own date filter.
- `lib/portal/wages.ts` helpers and tests.
- RLS, `qs_worker` role, `/wages/export.csv` route handler.
