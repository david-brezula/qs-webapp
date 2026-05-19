# Per-Worker Default Rates + Worker-Facing Wages with Postgres RLS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each worker a default tie/connect rate that seeds project assignments, add a worker-facing wages page that shows only that worker's own totals and per-project breakdown, and enforce the isolation with PostgreSQL Row Level Security.

**Architecture:** Admin reads/writes keep using the existing owner database connection, which bypasses RLS because RLS is enabled `NOT FORCE`d. A new restricted `qs_worker` role, used through a second Prisma client wrapped in `withWorkerScope`, is subject to RLS policies that scope every row to the current worker. The worker wage page is the only consumer of that restricted connection.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), Prisma 7 + `@prisma/adapter-pg`, PostgreSQL (Supabase), NextAuth v5, next-intl, Vitest.

**Project note:** This repo runs a modified Next.js — per `AGENTS.md`, consult `node_modules/next/dist/docs/` before using any unfamiliar Next API. This plan only edits an existing `proxy.ts` condition and standard server components, so no new Next APIs are introduced.

**Spec:** `docs/superpowers/specs/2026-05-19-worker-rates-and-wage-rls-design.md`

---

## File Structure

**New files**

- `prisma/migrations/<ts>_add_worker_default_rates/migration.sql` — generated migration for the two `User` columns.
- `prisma/migrations/<ts>_enable_wage_rls/migration.sql` — hand-written: enable RLS, policies, helper function.
- `lib/prisma-worker.ts` — restricted Prisma client + `withWorkerScope` helper.
- `app/(app)/wages/MyWagesView.tsx` — worker-facing wages UI (client component).
- `scripts/setup-rls-role.sql` — creates the `qs_worker` role and grants.
- `scripts/verify-rls.mjs` — runnable proof the RLS policies isolate a worker.

**Modified files**

- `prisma/schema.prisma` — `User.defaultPriceTie`, `User.defaultPriceConnect`.
- `lib/actions/workers.ts` — persist the two default rates in `updateWorkerAction`.
- `app/(app)/workers/[userId]/EditWorkerForm.tsx`, `page.tsx` — default-rate inputs.
- `app/(app)/projects/[projectId]/edit/WorkersPanel.tsx`, `page.tsx` — pre-fill rates from defaults.
- `lib/portal/wages.ts` — add `computeWagesByProject`.
- `lib/portal/wages.test.ts` — tests for `computeWagesByProject`.
- `app/(app)/wages/page.tsx` — role branch (admin vs worker).
- `lib/portal-nav.ts` — `wages` entry for the `WORKER` role.
- `proxy.ts` — let workers reach exactly `/wages`.
- `messages/en.json`, `messages/sk.json` — new i18n keys.
- `.env.example` — `DATABASE_URL_WORKER`.

---

## Task 1: Verify the runtime DB role bypasses RLS

This is a **gate**. The whole RLS design assumes the app's runtime connection (`DATABASE_URL`) owns the wage tables — table owners bypass `ENABLE`d-but-not-`FORCE`d RLS. If this is false, enabling RLS in Task 7 would make admin pages return empty.

**Files:** none (verification only).

- [ ] **Step 1: Query the connecting role's ownership/bypass status**

Run:
```bash
node --env-file=.env -e "import('pg').then(async ({default: pg}) => { const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect(); const r = await c.query(\"SELECT current_user, (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypassrls, EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ProjectWorker' AND tableowner = current_user) AS owns_tables\"); console.log(r.rows[0]); await c.end(); });"
```

Expected: a single row where **either** `owns_tables` is `true` **or** `bypassrls` is `true`.

- [ ] **Step 2: Decide**

- If `owns_tables` or `bypassrls` is `true` → the plan proceeds unchanged. Continue to Task 2.
- If **both** are `false` → **STOP**. Do not continue. Report to the user: the app's DB role neither owns the tables nor has `BYPASSRLS`, so enabling RLS would break admin pages. The fix (granting `BYPASSRLS` to the owner, which may require a Supabase admin role) must be agreed before continuing.

No commit — this task changes no files.

---

## Task 2: Add default-rate columns to `User`

**Files:**
- Modify: `prisma/schema.prisma:34-48` (the `User` model)
- Create: `prisma/migrations/<ts>_add_worker_default_rates/migration.sql` (generated)

- [ ] **Step 1: Add the two fields to the `User` model**

In `prisma/schema.prisma`, change the `User` model — replace:
```prisma
  mustChangePassword Boolean  @default(true)
  createdAt          DateTime @default(now())
```
with:
```prisma
  mustChangePassword Boolean  @default(true)
  defaultPriceTie     Decimal  @default(0) @db.Decimal(10, 2)
  defaultPriceConnect Decimal  @default(0) @db.Decimal(10, 2)
  createdAt          DateTime @default(now())
```

- [ ] **Step 2: Generate and apply the migration**

Run:
```bash
npm run db:migrate -- --name add_worker_default_rates
```
Expected: a new folder `prisma/migrations/<timestamp>_add_worker_default_rates/` containing `migration.sql` with two `ALTER TABLE "User" ADD COLUMN ... DECIMAL(10,2) NOT NULL DEFAULT 0` statements; Prisma reports the migration applied and the client regenerated.

- [ ] **Step 3: Verify the columns exist**

Run:
```bash
node --env-file=.env -e "import('pg').then(async ({default: pg}) => { const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect(); const r = await c.query(\"SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name IN ('defaultPriceTie','defaultPriceConnect') ORDER BY column_name\"); console.log(r.rows); await c.end(); });"
```
Expected: two rows — `defaultPriceConnect` and `defaultPriceTie`.

- [ ] **Step 4: Confirm the build still passes**

Run: `npm run build`
Expected: build succeeds (the new columns are optional-with-default, no code references them yet).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add per-worker default tie/connect rate columns"
```

---

## Task 3: Persist default rates in `updateWorkerAction`

**Files:**
- Modify: `lib/actions/workers.ts:84-125`

- [ ] **Step 1: Add the two fields to `updateSchema`**

In `lib/actions/workers.ts`, replace the `updateSchema` definition:
```ts
const updateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(1),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  role: z.enum(["ADMIN", "WORKER"]),
  language: z.enum(["EN", "SK"]),
  active: z.coerce.boolean(),
});
```
with:
```ts
const updateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(1),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  role: z.enum(["ADMIN", "WORKER"]),
  language: z.enum(["EN", "SK"]),
  active: z.coerce.boolean(),
  defaultPriceTie: z.coerce.number().nonnegative(),
  defaultPriceConnect: z.coerce.number().nonnegative(),
});
```

- [ ] **Step 2: Parse and persist the two new fields**

In the same file, in `updateWorkerAction`, replace the `safeParse` call:
```ts
  const parsed = updateSchema.safeParse({
    userId: fd.get("userId"),
    name: fd.get("name"),
    email: fd.get("email"),
    role: fd.get("role"),
    language: fd.get("language"),
    active: fd.get("active") === "on" || fd.get("active") === "true",
  });
```
with:
```ts
  const parsed = updateSchema.safeParse({
    userId: fd.get("userId"),
    name: fd.get("name"),
    email: fd.get("email"),
    role: fd.get("role"),
    language: fd.get("language"),
    active: fd.get("active") === "on" || fd.get("active") === "true",
    defaultPriceTie: fd.get("defaultPriceTie"),
    defaultPriceConnect: fd.get("defaultPriceConnect"),
  });
```
and replace the `prisma.user.update` call:
```ts
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      role: parsed.data.role as Role,
      language: parsed.data.language as Locale,
      active: parsed.data.active,
    },
  });
```
with:
```ts
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      role: parsed.data.role as Role,
      language: parsed.data.language as Locale,
      active: parsed.data.active,
      defaultPriceTie: parsed.data.defaultPriceTie,
      defaultPriceConnect: parsed.data.defaultPriceConnect,
    },
  });
```

- [ ] **Step 3: Confirm lint and build pass**

Run: `npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/workers.ts
git commit -m "feat: persist worker default rates in updateWorkerAction"
```

---

## Task 4: Default-rate inputs on the worker profile form

**Files:**
- Modify: `app/(app)/workers/[userId]/page.tsx:30-39`
- Modify: `app/(app)/workers/[userId]/EditWorkerForm.tsx`
- Modify: `messages/en.json`, `messages/sk.json` (the `workers` namespace)

- [ ] **Step 1: Add the i18n keys**

In `messages/en.json`, inside the `"workers"` object, add:
```json
    "defaultPriceTie": "Default tie rate",
    "defaultPriceConnect": "Default connect rate",
```
In `messages/sk.json`, inside the `"workers"` object, add:
```json
    "defaultPriceTie": "Predvolená cena za uviazanie",
    "defaultPriceConnect": "Predvolená cena za zapojenie",
```

- [ ] **Step 2: Pass the rates from the page to the form**

In `app/(app)/workers/[userId]/page.tsx`, replace the `<EditWorkerForm ... />` block:
```tsx
      <EditWorkerForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          language: user.language,
          active: user.active,
        }}
      />
```
with:
```tsx
      <EditWorkerForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          language: user.language,
          active: user.active,
          defaultPriceTie: Number(user.defaultPriceTie),
          defaultPriceConnect: Number(user.defaultPriceConnect),
        }}
      />
```

- [ ] **Step 3: Add the inputs to `EditWorkerForm`**

In `app/(app)/workers/[userId]/EditWorkerForm.tsx`, extend the `user` prop type — replace:
```tsx
  user: {
    id: string;
    name: string;
    email: string | null;
    role: "ADMIN" | "WORKER";
    language: "EN" | "SK";
    active: boolean;
  };
```
with:
```tsx
  user: {
    id: string;
    name: string;
    email: string | null;
    role: "ADMIN" | "WORKER";
    language: "EN" | "SK";
    active: boolean;
    defaultPriceTie: number;
    defaultPriceConnect: number;
  };
```

Then add the two fields to the form. Replace the language `<FormSelect>` … `</FormSelect>` block's closing tag followed by the `active` label — specifically, insert the two `FormField`s between the language `FormSelect` and the `active` checkbox `<label>`. Replace:
```tsx
        <FormSelect
          label={tCommon("language")}
          name="language"
          defaultValue={user.language}
          required
          options={[
            { value: "EN", label: "English" },
            { value: "SK", label: "Slovenčina" },
          ]}
          error={errors.language}
        />
        <label className="flex items-center gap-2 text-sm text-slate-ink">
```
with:
```tsx
        <FormSelect
          label={tCommon("language")}
          name="language"
          defaultValue={user.language}
          required
          options={[
            { value: "EN", label: "English" },
            { value: "SK", label: "Slovenčina" },
          ]}
          error={errors.language}
        />
        <FormField
          label={t("defaultPriceTie")}
          name="defaultPriceTie"
          type="number"
          step="0.01"
          defaultValue={user.defaultPriceTie}
          error={errors.defaultPriceTie}
        />
        <FormField
          label={t("defaultPriceConnect")}
          name="defaultPriceConnect"
          type="number"
          step="0.01"
          defaultValue={user.defaultPriceConnect}
          error={errors.defaultPriceConnect}
        />
        <label className="flex items-center gap-2 text-sm text-slate-ink">
```

`FormField` is already imported in this file and accepts `type`, `step`, and a numeric `defaultValue`. The form already injects `userId` via `fd.set("userId", user.id)` in `onSave`; the two new inputs are picked up automatically by `new FormData(e.currentTarget)`.

- [ ] **Step 4: Confirm lint and build pass**

Run: `npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 5: Manual check**

Start the dev server (`npm run dev`), open a worker's profile at `/workers/<id>` as an admin. Confirm the two rate fields appear, pre-filled with the worker's current defaults (0 for existing workers). Change them, Save, reload — the values persist.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/workers messages/en.json messages/sk.json
git commit -m "feat: edit per-worker default rates on the worker profile"
```

---

## Task 5: Pre-fill rates from defaults in `WorkersPanel`

When an admin picks a worker to assign to a project, the tie/connect inputs should pre-fill from that worker's default rates. The inline per-row edit and the per-project override are unchanged.

**Files:**
- Modify: `app/(app)/projects/[projectId]/edit/page.tsx:75-77`
- Modify: `app/(app)/projects/[projectId]/edit/WorkersPanel.tsx`

- [ ] **Step 1: Carry the default rates in the `available` list**

In `app/(app)/projects/[projectId]/edit/page.tsx`, replace:
```tsx
          available={allWorkers
            .filter((u) => !project.projectWorkers.find((pw) => pw.userId === u.id))
            .map((u) => ({ id: u.id, name: u.name, email: u.email ?? u.username }))}
```
with:
```tsx
          available={allWorkers
            .filter((u) => !project.projectWorkers.find((pw) => pw.userId === u.id))
            .map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email ?? u.username,
              defaultPriceTie: Number(u.defaultPriceTie),
              defaultPriceConnect: Number(u.defaultPriceConnect),
            }))}
```

- [ ] **Step 2: Extend the `available` prop type in `WorkersPanel`**

In `app/(app)/projects/[projectId]/edit/WorkersPanel.tsx`, replace:
```tsx
  available: { id: string; name: string; email: string }[];
```
with:
```tsx
  available: { id: string; name: string; email: string; defaultPriceTie: number; defaultPriceConnect: number }[];
```

- [ ] **Step 3: Pre-fill the inputs when a worker is selected**

In the same file, in the `available.length > 0` block, replace the `<select>`:
```tsx
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          >
```
with:
```tsx
          <select
            value={selected}
            onChange={(e) => {
              const id = e.target.value;
              setSelected(id);
              const worker = available.find((u) => u.id === id);
              setPriceTie(worker ? String(worker.defaultPriceTie) : "");
              setPriceConnect(worker ? String(worker.defaultPriceConnect) : "");
            }}
            className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          >
```

- [ ] **Step 4: Confirm lint and build pass**

Run: `npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 5: Manual check**

As an admin, open a project's edit page (`/projects/<id>/edit`). In the "Assign worker" row, pick a worker from the dropdown — the tie/connect inputs fill with that worker's default rates. They remain editable before clicking Assign.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/projects/[projectId]/edit"
git commit -m "feat: pre-fill project rates from worker default rates"
```

---

## Task 6: `computeWagesByProject` helper (TDD)

A pure helper that, for a single worker, returns overall totals plus one breakdown per project. It reuses the existing, tested `computeWages` and does not modify it.

**Files:**
- Modify: `lib/portal/wages.ts`
- Test: `lib/portal/wages.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/portal/wages.test.ts`:
```ts
const soloInput: WageInput & { projects: { id: string; name: string }[] } = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  workers: [{ id: "w1", name: "Alice" }],
  projects: [
    { id: "p1", name: "Alpha" },
    { id: "p2", name: "Beta" },
    { id: "p3", name: "Gamma" },
  ],
  prices: [
    { projectId: "p1", userId: "w1", priceTie: 1.5, priceConnect: 2.0 },
    { projectId: "p2", userId: "w1", priceTie: 1.0, priceConnect: 1.0 },
    { projectId: "p3", userId: "w1", priceTie: 1.0, priceConnect: 1.0 },
  ],
  activity: [
    { userId: "w1", projectId: "p1", action: "TIE", count: 100, workDate: new Date("2026-05-10") },
    { userId: "w1", projectId: "p2", action: "CONNECT", count: 40, workDate: new Date("2026-05-11") },
  ],
  accommodations: [],
};

describe("computeWagesByProject", () => {
  it("totals earnings across every project", () => {
    const r = computeWagesByProject(soloInput);
    // p1: 100*1.5 = 150 ; p2: 40*1.0 = 40
    expect(r.total.earnings).toBe(190);
  });

  it("returns one breakdown row per project with activity", () => {
    const r = computeWagesByProject(soloInput);
    expect(r.byProject.map((p) => p.projectId).sort()).toEqual(["p1", "p2"]);
    const p1 = r.byProject.find((p) => p.projectId === "p1")!;
    expect(p1.projectName).toBe("Alpha");
    expect(p1.earnings).toBe(150);
    expect(p1.breakdown.tie).toBe(150);
  });

  it("excludes projects the worker had no activity on in the range", () => {
    const r = computeWagesByProject(soloInput);
    expect(r.byProject.find((p) => p.projectId === "p3")).toBeUndefined();
  });

  it("passes through the mixed-currency flag", () => {
    const r = computeWagesByProject({
      ...soloInput,
      accommodations: [
        { id: "a1", totalCost: 100, currency: "USD", startDate: new Date("2026-05-05"), endDate: new Date("2026-05-06"), workerIds: ["w1"], projectId: "p1" },
        { id: "a2", totalCost: 100, currency: "EUR", startDate: new Date("2026-05-07"), endDate: new Date("2026-05-08"), workerIds: ["w1"], projectId: "p2" },
      ],
    });
    expect(r.mixedCurrencies).toBe(true);
  });
});
```

Also update the import line at the top of `lib/portal/wages.test.ts` — replace:
```ts
import { computeWages, type WageInput } from "./wages";
```
with:
```ts
import { computeWages, computeWagesByProject, type WageInput } from "./wages";
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- wages`
Expected: FAIL — `computeWagesByProject is not a function` (or an import error). The existing `computeWages` tests still pass.

- [ ] **Step 3: Implement `computeWagesByProject`**

Append to `lib/portal/wages.ts`:
```ts
export interface ProjectWageBreakdown {
  projectId: string;
  projectName: string;
  earnings: number;
  accommodation: number;
  wage: number;
  breakdown: { tie: number; connect: number };
}

export interface WageByProjectResult {
  total: WageRow;
  byProject: ProjectWageBreakdown[];
  mixedCurrencies: boolean;
}

/**
 * For a single worker, computes overall wage totals plus one breakdown row per
 * project they had activity on within the range. Reuses `computeWages` — once
 * for the totals, once per project — so the wage rules stay in one place.
 *
 * `input.workers` is expected to contain exactly the one worker being viewed.
 */
export function computeWagesByProject(
  input: WageInput & { projects: { id: string; name: string }[] },
): WageByProjectResult {
  const overall = computeWages({ ...input, projectId: null });
  const total: WageRow = overall.rows[0] ?? {
    userId: "",
    name: "",
    earnings: 0,
    accommodation: 0,
    wage: 0,
    breakdown: { tie: 0, connect: 0 },
    warnings: [],
  };

  const byProject: ProjectWageBreakdown[] = [];
  for (const project of input.projects) {
    const row = computeWages({ ...input, projectId: project.id }).rows[0];
    if (!row) continue;
    if (row.earnings === 0 && row.accommodation === 0) continue;
    byProject.push({
      projectId: project.id,
      projectName: project.name,
      earnings: row.earnings,
      accommodation: row.accommodation,
      wage: row.wage,
      breakdown: row.breakdown,
    });
  }

  return { total, byProject, mixedCurrencies: overall.mixedCurrencies };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- wages`
Expected: PASS — all `computeWages` and `computeWagesByProject` tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/portal/wages.ts lib/portal/wages.test.ts
git commit -m "feat: add computeWagesByProject wage breakdown helper"
```

---

## Task 7: Enable RLS migration (policies + helper function)

Hand-written SQL migration: enables RLS on the eight wage-read tables, creates a `SELECT` policy on each, and a `SECURITY DEFINER` helper function. Admin/owner queries are unaffected — RLS is `ENABLE`d, never `FORCE`d, and the owner bypasses it.

**Why the helper function:** the `Accommodation` ↔ `AccommodationWorker` relationship would make two policies reference each other and recurse. `app_worker_accommodation_ids()` is `SECURITY DEFINER` (runs as the owner, bypassing RLS), which breaks the cycle: `AccommodationWorker`'s policy calls the function, and `Accommodation`'s policy composes off `AccommodationWorker`. The project-side tables compose without a function: each policy filters by the already-RLS-scoped related table.

**Files:**
- Create: `prisma/migrations/<ts>_enable_wage_rls/migration.sql`

- [ ] **Step 1: Create the migration folder**

Generate a 14-digit UTC timestamp **later** than the `add_worker_default_rates` folder from Task 2:
```bash
node -e "console.log(new Date().toISOString().replace(/\D/g,'').slice(0,14))"
```
Create the folder `prisma/migrations/<timestamp>_enable_wage_rls/` and an empty `migration.sql` inside it.

- [ ] **Step 2: Write the migration SQL**

Put this exact content in that `migration.sql`:
```sql
-- Worker wage Row Level Security.
-- RLS is ENABLEd (not FORCEd): the table owner — the role the app and Prisma
-- migrations connect as — bypasses every policy below. Only the restricted
-- `qs_worker` role (created by scripts/setup-rls-role.sql) is constrained.

-- Helper: the accommodation ids the current worker belongs to. SECURITY
-- DEFINER so it runs as the owner and bypasses RLS, which breaks the
-- otherwise-recursive Accommodation/AccommodationWorker policy cycle.
CREATE OR REPLACE FUNCTION app_worker_accommodation_ids()
  RETURNS TABLE (accommodation_id text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT "accommodationId"
  FROM "AccommodationWorker"
  WHERE "userId" = current_setting('app.user_id', true)
$$;

-- User: the worker sees only their own row.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_user ON "User"
  FOR SELECT
  USING (id = current_setting('app.user_id', true));

-- ProjectWorker: the worker sees only their own assignment/rate rows.
ALTER TABLE "ProjectWorker" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_project_worker ON "ProjectWorker"
  FOR SELECT
  USING ("userId" = current_setting('app.user_id', true));

-- Project: projects the worker is assigned to (ProjectWorker is RLS-scoped).
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_project ON "Project"
  FOR SELECT
  USING (id IN (SELECT "projectId" FROM "ProjectWorker"));

-- Section: sections of the worker's projects (Project is RLS-scoped).
ALTER TABLE "Section" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_section ON "Section"
  FOR SELECT
  USING ("projectId" IN (SELECT id FROM "Project"));

-- Table: tables in the worker's sections (Section is RLS-scoped).
ALTER TABLE "Table" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_table ON "Table"
  FOR SELECT
  USING ("sectionId" IN (SELECT id FROM "Section"));

-- ActivityLog: rows tied to one of the worker's ProjectWorker rows.
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_activity_log ON "ActivityLog"
  FOR SELECT
  USING ("projectWorkerId" IN (SELECT id FROM "ProjectWorker"));

-- AccommodationWorker: every member of accommodations the worker belongs to,
-- so the worker page can count heads to split the cost.
ALTER TABLE "AccommodationWorker" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_accommodation_worker ON "AccommodationWorker"
  FOR SELECT
  USING ("accommodationId" IN (SELECT accommodation_id FROM app_worker_accommodation_ids()));

-- Accommodation: accommodations the worker belongs to (AccommodationWorker is
-- RLS-scoped).
ALTER TABLE "Accommodation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_accommodation ON "Accommodation"
  FOR SELECT
  USING (id IN (SELECT "accommodationId" FROM "AccommodationWorker"));
```

- [ ] **Step 3: Apply the migration**

Run:
```bash
npm run db:migrate
```
Expected: Prisma detects the new `enable_wage_rls` migration as pending, applies it, and reports success. (Prisma does not model RLS/policies/functions, so this produces no schema drift.)

- [ ] **Step 4: Verify RLS is on and policies exist**

Run:
```bash
node --env-file=.env -e "import('pg').then(async ({default: pg}) => { const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect(); const t = await c.query(\"SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND rowsecurity AND tablename IN ('User','Project','Section','Table','ProjectWorker','ActivityLog','Accommodation','AccommodationWorker')\"); const p = await c.query(\"SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public'\"); console.log({ rls_tables: t.rows[0].n, policies: p.rows[0].n }); await c.end(); });"
```
Expected: `rls_tables: 8` and `policies: 8`.

- [ ] **Step 5: Verify admin pages still work**

With `npm run dev` running, open `/wages` as an admin and confirm the wages table still renders data (the owner connection bypasses RLS). Open `/projects` and `/workers` — both still load.

- [ ] **Step 6: Commit**

```bash
git add prisma/migrations
git commit -m "feat: enable Postgres RLS on worker wage tables"
```

---

## Task 8: Create the `qs_worker` role (setup script)

A repeatable SQL script that creates the restricted, RLS-enforced role and grants it `SELECT` on the eight tables. Run once per environment, after migrations. Kept out of the Prisma migration so the migration has no role dependency.

**Files:**
- Create: `scripts/setup-rls-role.sql`

- [ ] **Step 1: Write the setup script**

Create `scripts/setup-rls-role.sql`:
```sql
-- Creates the restricted role used by the worker-facing wages page.
-- Run once per environment, AFTER `prisma migrate deploy`, as the database
-- owner. Supply the password as a psql variable:
--
--   psql "$DATABASE_URL" -v worker_password=CHOOSE_A_STRONG_PASSWORD \
--     -f scripts/setup-rls-role.sql
--
-- The role is LOGIN, NOSUPERUSER, NOBYPASSRLS and gets SELECT only — it can
-- never write, and it is fully subject to the policies from the
-- enable_wage_rls migration.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qs_worker') THEN
    CREATE ROLE qs_worker LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

ALTER ROLE qs_worker WITH PASSWORD :'worker_password';

GRANT USAGE ON SCHEMA public TO qs_worker;

GRANT SELECT ON
  "User",
  "Project",
  "Section",
  "Table",
  "ProjectWorker",
  "ActivityLog",
  "Accommodation",
  "AccommodationWorker"
TO qs_worker;

GRANT EXECUTE ON FUNCTION app_worker_accommodation_ids() TO qs_worker;
```

- [ ] **Step 2: Run the script against the dev database**

Choose a strong password and run (replace `<STRONG_PW>`):
```bash
psql "$(node --env-file=.env -e "process.stdout.write(process.env.DATABASE_URL)")" -v worker_password=<STRONG_PW> -f scripts/setup-rls-role.sql
```
Expected: `CREATE ROLE` (or no error if it already exists), `ALTER ROLE`, two `GRANT` lines, `GRANT`.

If `psql` is not installed locally, run the same statements through any SQL client connected as the owner, substituting the password literal for `:'worker_password'`.

- [ ] **Step 3: Verify the role exists with the right attributes**

Run:
```bash
node --env-file=.env -e "import('pg').then(async ({default: pg}) => { const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect(); const r = await c.query(\"SELECT rolcanlogin, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='qs_worker'\"); console.log(r.rows[0]); await c.end(); });"
```
Expected: `{ rolcanlogin: true, rolsuper: false, rolbypassrls: false }`.

- [ ] **Step 4: Commit**

```bash
git add scripts/setup-rls-role.sql
git commit -m "feat: add qs_worker RLS role setup script"
```

---

## Task 9: Worker-scoped Prisma client + `withWorkerScope`

A second Prisma client connecting as `qs_worker`, plus a helper that runs queries inside a transaction carrying the current worker's id as `app.user_id`.

**Files:**
- Create: `lib/prisma-worker.ts`
- Modify: `.env.example`
- Manual: add `DATABASE_URL_WORKER` to the local `.env`

- [ ] **Step 1: Add `DATABASE_URL_WORKER` to `.env.example`**

In `.env.example`, append after the `DIRECT_URL` block (before the Auth section):
```
# Restricted, RLS-enforced role for the worker-facing wages page. Same host as
# DATABASE_URL but authenticating as the `qs_worker` role created by
# scripts/setup-rls-role.sql. On Supabase the pooled username is
# `qs_worker.[project-ref]`.
DATABASE_URL_WORKER="postgresql://qs_worker.[project-ref]:[qs_worker-password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

- [ ] **Step 2: Add the real value to the local `.env`**

Add a `DATABASE_URL_WORKER` line to the local `.env`, using the `qs_worker` password set in Task 8. This must be present before Task 12's build, because `lib/prisma-worker.ts` reads it at module load (mirroring `lib/prisma.ts`).

- [ ] **Step 3: Create `lib/prisma-worker.ts`**

```ts
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrismaWorker = globalThis as unknown as {
  prismaWorker: PrismaClient | undefined;
};

function createWorkerClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL_WORKER;
  if (!connectionString) {
    throw new Error("DATABASE_URL_WORKER environment variable is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Prisma client connecting as the restricted `qs_worker` role. Every query it
 * issues is subject to the worker wage RLS policies. Use only through
 * `withWorkerScope`.
 */
export const prismaWorker =
  globalForPrismaWorker.prismaWorker ?? createWorkerClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrismaWorker.prismaWorker = prismaWorker;
}

/**
 * Runs `fn` against the RLS-enforced worker connection inside a transaction
 * whose `app.user_id` setting is `userId`. The setting is transaction-local
 * (third arg of `set_config` is `true`), so it is safe under connection
 * pooling — it never leaks to another request's transaction.
 */
export async function withWorkerScope<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prismaWorker.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
```

- [ ] **Step 4: Confirm lint and build pass**

Run: `npm run lint && npm run build`
Expected: both succeed. (`prisma-worker.ts` is not imported anywhere yet, so the build does not evaluate it — but `DATABASE_URL_WORKER` should already be set from Step 2.)

- [ ] **Step 5: Commit**

```bash
git add lib/prisma-worker.ts .env.example
git commit -m "feat: add RLS-scoped worker Prisma client and withWorkerScope"
```

---

## Task 10: RLS isolation verification script

A runnable script proving the policies isolate one worker: it picks a real worker via the owner connection, then connects as `qs_worker` and asserts the scoped query returns exactly that worker's rows and an unscoped query returns nothing.

**Files:**
- Create: `scripts/verify-rls.mjs`

- [ ] **Step 1: Create `scripts/verify-rls.mjs`**

```js
// Verifies the worker wage RLS policies isolate one worker's data.
// Run after scripts/setup-rls-role.sql, with seed data present:
//   node --env-file=.env scripts/verify-rls.mjs
import pg from "pg";

const ownerUrl = process.env.DATABASE_URL;
const workerUrl = process.env.DATABASE_URL_WORKER;
if (!ownerUrl || !workerUrl) {
  console.error("DATABASE_URL and DATABASE_URL_WORKER must both be set.");
  process.exit(1);
}

// As the owner, pick the worker with the most ProjectWorker rows.
const owner = new pg.Client({ connectionString: ownerUrl });
await owner.connect();
const sample = await owner.query(
  `SELECT "userId", count(*)::int AS pw_rows
   FROM "ProjectWorker"
   GROUP BY "userId"
   ORDER BY pw_rows DESC
   LIMIT 1`,
);
await owner.end();

if (sample.rows.length === 0) {
  console.error("No ProjectWorker rows exist — seed data first.");
  process.exit(1);
}
const { userId, pw_rows: expected } = sample.rows[0];

// As qs_worker, query with and without the RLS context set.
const worker = new pg.Client({ connectionString: workerUrl });
await worker.connect();

await worker.query("BEGIN");
await worker.query("SELECT set_config('app.user_id', $1, true)", [userId]);
const scoped = await worker.query('SELECT count(*)::int AS n FROM "ProjectWorker"');
const foreign = await worker.query(
  'SELECT count(*)::int AS n FROM "ProjectWorker" WHERE "userId" <> $1',
  [userId],
);
await worker.query("COMMIT");

const noContext = await worker.query('SELECT count(*)::int AS n FROM "ProjectWorker"');
await worker.end();

let ok = true;
if (scoped.rows[0].n !== expected) {
  console.error(`FAIL: scoped query saw ${scoped.rows[0].n} rows, expected ${expected}.`);
  ok = false;
}
if (foreign.rows[0].n !== 0) {
  console.error(`FAIL: worker saw ${foreign.rows[0].n} other workers' rows.`);
  ok = false;
}
if (noContext.rows[0].n !== 0) {
  console.error(`FAIL: with no context set, worker saw ${noContext.rows[0].n} rows.`);
  ok = false;
}

if (ok) {
  console.log(`PASS: RLS isolates worker ${userId} — ${expected} own rows, 0 leaked, 0 without context.`);
  process.exit(0);
}
process.exit(1);
```

- [ ] **Step 2: Run the verification script**

Run:
```bash
node --env-file=.env scripts/verify-rls.mjs
```
Expected: `PASS: RLS isolates worker <id> — N own rows, 0 leaked, 0 without context.` and exit code 0.

If the import of `pg` fails (`Cannot find package 'pg'`), install it as a dev dependency — `npm install --save-dev pg` — and re-run. (`pg` ships transitively with `@prisma/adapter-pg`; an explicit devDependency makes the script self-sufficient.)

If the script reports `FAIL`, **stop** and investigate the policies before continuing — the worker page must not ship without this passing.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-rls.mjs package.json package-lock.json
git commit -m "test: add RLS worker-isolation verification script"
```

(If `pg` was not installed, `package.json`/`package-lock.json` are unchanged — omit them from the `git add`.)

---

## Task 11: `MyWagesView` component

The worker-facing wages UI: a date-range filter and a table with one row per project plus a totals row. Client component, modeled on the existing `WagesView`.

**Files:**
- Create: `app/(app)/wages/MyWagesView.tsx`
- Modify: `messages/en.json`, `messages/sk.json` (the `wages` namespace)

- [ ] **Step 1: Add the i18n keys**

In `messages/en.json`, inside the `"wages"` object, add:
```json
    "project": "Project",
    "tie": "Tie",
    "connect": "Connect",
```
In `messages/sk.json`, inside the `"wages"` object, add:
```json
    "project": "Projekt",
    "tie": "Uviazanie",
    "connect": "Zapojenie",
```

- [ ] **Step 2: Create `app/(app)/wages/MyWagesView.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";

type ProjectRow = {
  projectId: string;
  projectName: string;
  earnings: number;
  accommodation: number;
  wage: number;
  breakdown: { tie: number; connect: number };
};

type Result = {
  total: {
    earnings: number;
    accommodation: number;
    wage: number;
    breakdown: { tie: number; connect: number };
    warnings: string[];
  };
  byProject: ProjectRow[];
  mixedCurrencies: boolean;
};

export function MyWagesView({
  from,
  to,
  result,
}: {
  from: string;
  to: string;
  result: Result;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations("wages");
  const tCommon = useTranslations("common");
  const [f, setF] = useState(from);
  const [tt, setTt] = useState(to);

  function apply() {
    const params = new URLSearchParams(sp);
    params.set("from", f);
    params.set("to", tt);
    router.push(`/wages?${params.toString()}`);
  }

  const hasTotal =
    result.total.earnings !== 0 || result.total.accommodation !== 0;

  const rows: string[][] = result.byProject.map((p) => [
    p.projectName,
    p.breakdown.tie.toFixed(2),
    p.breakdown.connect.toFixed(2),
    p.earnings.toFixed(2),
    p.accommodation.toFixed(2),
    p.wage.toFixed(2),
  ]);
  if (hasTotal) {
    rows.push([
      tCommon("total"),
      result.total.breakdown.tie.toFixed(2),
      result.total.breakdown.connect.toFixed(2),
      result.total.earnings.toFixed(2),
      result.total.accommodation.toFixed(2),
      result.total.wage.toFixed(2),
    ]);
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end mb-6">
        <div className="w-full sm:w-auto">
          <label className="text-xs text-muted block mb-1">{t("from")}</label>
          <input type="date" value={f} onChange={(e) => setF(e.target.value)} className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </div>
        <div className="w-full sm:w-auto">
          <label className="text-xs text-muted block mb-1">{t("to")}</label>
          <input type="date" value={tt} onChange={(e) => setTt(e.target.value)} className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
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

      <DataTable
        headers={[t("project"), t("tie"), t("connect"), t("earnings"), t("accommodation"), t("wage")]}
        empty={t("noData")}
        rows={rows}
      />
    </>
  );
}
```

- [ ] **Step 3: Confirm lint and build pass**

Run: `npm run lint && npm run build`
Expected: both succeed. (`MyWagesView` is not imported yet — Task 12 wires it.)

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/wages/MyWagesView.tsx" messages/en.json messages/sk.json
git commit -m "feat: add worker-facing MyWagesView component"
```

---

## Task 12: Wire the `/wages` page, proxy, and nav for workers

Branch the `/wages` page by role, let workers through `proxy.ts`, and add the nav entry.

**Files:**
- Modify: `app/(app)/wages/page.tsx`
- Modify: `proxy.ts:45-47`
- Modify: `lib/portal-nav.ts:18-21`

- [ ] **Step 1: Allow workers to reach `/wages` in `proxy.ts`**

In `proxy.ts`, replace:
```ts
  const isWorkerProjectLog = /^\/projects\/[^/]+\/log\/?$/.test(pathname);

  if (isAdminOnly && token.role !== "ADMIN" && !isWorkerProjectLog) {
```
with:
```ts
  const isWorkerProjectLog = /^\/projects\/[^/]+\/log\/?$/.test(pathname);
  const isWorkerWages = pathname === "/wages";

  if (isAdminOnly && token.role !== "ADMIN" && !isWorkerProjectLog && !isWorkerWages) {
```
This exempts only the exact `/wages` path — `/wages/export.csv` still matches the `/wages/` prefix and stays admin-only.

- [ ] **Step 2: Add the worker nav entry**

In `lib/portal-nav.ts`, replace:
```ts
  return [{ href: "/dashboard", labelKey: "dashboard" }];
```
with:
```ts
  return [
    { href: "/dashboard", labelKey: "dashboard" },
    { href: "/wages", labelKey: "wages" },
  ];
```

- [ ] **Step 3: Rewrite `app/(app)/wages/page.tsx` with a role branch**

Replace the entire contents of `app/(app)/wages/page.tsx` with:
```tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { getTranslations } from "next-intl/server";
import { computeWages, computeWagesByProject } from "@/lib/portal/wages";
import { withWorkerScope } from "@/lib/prisma-worker";
import { WagesView } from "./WagesView";
import { MyWagesView } from "./MyWagesView";

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

  // Admin: all workers, read through the owner connection.
  const projectId = sp.projectId || undefined;

  const [workers, prices, activity, accommodations, projects] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({}),
    prisma.activityLog.findMany({
      where: { workDate: { gte: from, lte: to } },
      include: { projectWorker: true, table: { include: { section: true } } },
    }),
    prisma.accommodation.findMany({
      where: { startDate: { lte: to }, endDate: { gte: from } },
      include: { workers: true },
    }),
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const result = computeWages({
    from,
    to,
    projectId: projectId ?? null,
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
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>
      <WagesView
        from={fromStr}
        to={toStr}
        projectId={projectId ?? ""}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        result={result}
      />
    </div>
  );
}
```

- [ ] **Step 4: Confirm lint and build pass**

Run: `npm run lint && npm run build`
Expected: both succeed. (`DATABASE_URL_WORKER` must be set in `.env` — Task 9 Step 2.)

- [ ] **Step 5: Manual check — worker**

With `npm run dev` running, log in as a **worker**. Confirm:
- The sidebar shows a "Wages" link; it opens `/wages` (no redirect to `/dashboard`).
- The page shows the date filter and a table with one row per project the worker had activity on, plus a "Total" row.
- The figures match that worker's own activity and rates only.

- [ ] **Step 6: Manual check — isolation and admin**

- Still as the worker, confirm no other worker's name or figures appear anywhere on the page.
- Directly request `/wages/export.csv` as the worker → redirected to `/dashboard` (export stays admin-only).
- Log in as an **admin**, open `/wages` → the full all-workers table renders unchanged, with the project filter and CSV export.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/wages/page.tsx" proxy.ts lib/portal-nav.ts
git commit -m "feat: worker-facing wages page with per-project breakdown"
```

---

## Final Verification

- [ ] **Run the full test suite**

Run: `npm test`
Expected: all suites pass, including the new `computeWagesByProject` tests.

- [ ] **Run lint and build**

Run: `npm run lint && npm run build`
Expected: both succeed.

- [ ] **Re-run the RLS isolation check**

Run: `node --env-file=.env scripts/verify-rls.mjs`
Expected: `PASS`.

- [ ] **Confirm spec coverage**

- A. Default rates: `User` columns (Task 2), persisted (Task 3), edited on the profile (Task 4), seed assignments (Task 5). ✓
- B. Worker wage page: `MyWagesView` (Task 11), role-branched route + nav + proxy (Task 12), per-project breakdown via `computeWagesByProject` (Task 6). ✓
- C. Postgres RLS: policies + helper function (Task 7), `qs_worker` role (Task 8), scoped client (Task 9), verification (Tasks 1, 10). ✓

---

## Deployment Notes

When this branch is deployed to any environment (staging, production), in order:

1. Apply migrations: `prisma migrate deploy` (creates the columns, enables RLS, creates policies).
2. Run `scripts/setup-rls-role.sql` as the database owner, supplying a strong `worker_password`.
3. Set `DATABASE_URL_WORKER` in that environment's configuration, authenticating as `qs_worker`.
4. Run `node --env-file=.env scripts/verify-rls.mjs` against that environment to confirm isolation before announcing the feature.
