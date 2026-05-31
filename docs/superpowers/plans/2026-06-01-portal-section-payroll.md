# Worker Portal: Per-Section Payroll, Invoicing, Advances Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let workers see wages broken down by section (earnings, accommodation, net), tick a section as invoiced, and request advances (admin approves/pays, deducted from net); let admins attach an accommodation to a section so its cost is deducted from that section's wage line.

**Architecture:** Pure wage math stays in `lib/portal/wages.ts` (unit-tested with vitest). Writes go through server actions using `auth()`/`requireAdmin()` + zod on the owner Prisma client (which bypasses RLS); worker reads go through the RLS-enforced `withWorkerScope` connection. New `SectionInvoice` and `AdvanceRequest` models get SELECT-only RLS policies + grants for the `qs_worker` role. UI follows existing portal patterns (DataTable, FormField/FormSelect, client components calling actions then `router.refresh()`).

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 7 + PostgreSQL, next-auth v5, next-intl v4 (en/sk/de/fr/sv), Tailwind v4, vitest 4, zod 4.

**Spec:** `docs/superpowers/specs/2026-06-01-portal-section-payroll-design.md`

---

## File Structure

**Pure logic (modify):**
- `lib/portal/wages.ts` — add `sectionId` to accommodation input, filter accommodation by section, add accommodation/net to `SectionWageRow`, add `sumPaidAdvances`.
- `lib/portal/wages.test.ts` — tests for the above.

**Schema & DB (modify/create):**
- `prisma/schema.prisma` — `SectionInvoice`, `AdvanceRequest`, `AdvanceStatus`, `Accommodation.sectionId`, reverse relations.
- `prisma/migrations/*_add_section_invoice_advance/` — auto-generated.
- `prisma/migrations/*_rls_section_invoice_advance/migration.sql` — hand-written RLS + grants.
- `scripts/setup-rls-role.sql` — add new tables to the GRANT SELECT list.

**Server actions (create/modify):**
- `lib/actions/section-invoice.ts` — `toggleSectionInvoiceAction` (worker).
- `lib/actions/advances.ts` — `requestAdvanceAction`, `cancelAdvanceAction` (worker); `decideAdvanceAction`, `markAdvancePaidAction` (admin).
- `lib/actions/accommodations.ts` — accept `sectionId`.

**Routes / UI (create/modify):**
- `app/api/wages/projects/[projectId]/sections/route.ts` — return accommodation + invoiced per section.
- `app/[locale]/(portal)/wages/section-row.ts` — shared `WorkerSectionRow` type.
- `app/[locale]/(portal)/wages/page.tsx` — worker branch loads paid advances.
- `app/[locale]/(portal)/wages/MyWagesView.tsx` — section columns, invoiced toggle, advances/net totals.
- `app/[locale]/(portal)/wages/WorkerSectionBreakdown.tsx` — accommodation, net, invoiced checkbox.
- `app/[locale]/(portal)/wages/AdminSectionWageView.tsx` + `.../sections/[sectionId]/page.tsx` — accommodation column + invoiced indicator.
- `app/[locale]/(portal)/accommodations/AccommodationForm.tsx` + `new/page.tsx` + `[id]/page.tsx` — section select.
- `app/[locale]/(portal)/advances/page.tsx` + `MyAdvancesView.tsx` + `AdminAdvancesView.tsx` — advances screens.
- `lib/portal-nav.ts` — add Advances nav for both roles.
- `messages/{en,sk,de,fr,sv}.json` — new keys.

---

## Task 1: Wage math — section-attributed accommodation

**Files:**
- Modify: `lib/portal/wages.ts`
- Test: `lib/portal/wages.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `lib/portal/wages.test.ts`:

```ts
const sectionAccInput: WageInput = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  workers: [{ id: "w1", name: "Alice" }],
  prices: [{ projectId: "p1", userId: "w1", priceTie: 1.0, priceConnect: 1.0 }],
  activity: [
    { userId: "w1", projectId: "p1", sectionId: "s1", action: "TIE", count: 100, workDate: new Date("2026-05-10") },
    { userId: "w1", projectId: "p1", sectionId: "s2", action: "TIE", count: 100, workDate: new Date("2026-05-10") },
  ],
  accommodations: [
    { id: "a1", totalCost: 60, currency: "EUR", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-31"), workerIds: ["w1"], projectId: "p1", sectionId: "s1" },
  ],
};

describe("computeWages section accommodation", () => {
  it("deducts a section-assigned accommodation only in that section", () => {
    const s1 = computeWages({ ...sectionAccInput, projectId: "p1", sectionId: "s1" }).rows[0];
    expect(s1.accommodation).toBe(60);
    const s2 = computeWages({ ...sectionAccInput, projectId: "p1", sectionId: "s2" }).rows[0];
    expect(s2.accommodation).toBe(0);
  });

  it("counts a section-assigned accommodation once in the project total", () => {
    const proj = computeWages({ ...sectionAccInput, projectId: "p1" }).rows[0];
    expect(proj.accommodation).toBe(60);
  });

  it("ignores a section-assigned accommodation under a non-matching section filter", () => {
    const none = computeWages({ ...sectionAccInput, projectId: "p1", sectionId: "s3" }).rows[0];
    expect(none.accommodation).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/portal/wages.test.ts -t "section accommodation"`
Expected: FAIL — `s2.accommodation` is `60` (section filter not yet applied to accommodation), so "only in that section" fails.

- [ ] **Step 3: Add `sectionId` to the accommodation input type**

In `lib/portal/wages.ts`, in the `WageInput` interface, update the `accommodations` array element to add the optional field (add the last line):

```ts
  accommodations: {
    id: string;
    totalCost: number;
    currency: Currency;
    startDate: Date;
    endDate: Date;
    workerIds: string[];
    projectId: string | null;
    sectionId?: string | null;
  }[];
```

- [ ] **Step 4: Filter accommodation by section in `computeWages`**

In `lib/portal/wages.ts`, find the `overlappingAccommodations` filter inside `computeWages` and add the section line:

```ts
  const overlappingAccommodations = input.accommodations.filter((acc) => {
    if (projectFilter && acc.projectId !== projectFilter) return false;
    if (sectionFilter && acc.sectionId !== sectionFilter) return false;
    return overlaps(range, { start: acc.startDate, end: acc.endDate });
  });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/portal/wages.test.ts -t "section accommodation"`
Expected: PASS (3 passed).

- [ ] **Step 6: Run the full wages suite to confirm no regressions**

Run: `npx vitest run lib/portal/wages.test.ts`
Expected: PASS (all existing tests still green — project-level and section-filter tests unaffected).

- [ ] **Step 7: Commit**

```bash
git add lib/portal/wages.ts lib/portal/wages.test.ts
git commit -m "feat(wages): attribute accommodation to a section when sectionId is set"
```

---

## Task 2: Wage math — accommodation + net in `computeWagesBySection`

**Files:**
- Modify: `lib/portal/wages.ts`
- Test: `lib/portal/wages.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `lib/portal/wages.test.ts`:

```ts
const sectionBreakdownAccInput: WageInput & { sections: { id: string; name: string }[] } = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  projectId: "p1",
  workers: [{ id: "w1", name: "Alice" }],
  sections: [{ id: "s1", name: "North" }, { id: "s2", name: "South" }],
  prices: [{ projectId: "p1", userId: "w1", priceTie: 1.0, priceConnect: 1.0 }],
  activity: [
    { userId: "w1", projectId: "p1", sectionId: "s1", action: "TIE", count: 100, workDate: new Date("2026-05-10") },
  ],
  accommodations: [
    { id: "a1", totalCost: 40, currency: "EUR", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-31"), workerIds: ["w1"], projectId: "p1", sectionId: "s1" },
    { id: "a2", totalCost: 25, currency: "EUR", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-31"), workerIds: ["w1"], projectId: "p1", sectionId: "s2" },
  ],
};

describe("computeWagesBySection accommodation", () => {
  it("attributes accommodation and net to the section with earnings", () => {
    const rows = computeWagesBySection(sectionBreakdownAccInput);
    const s1 = rows.find((r) => r.sectionId === "s1")!;
    expect(s1.earnings).toBe(100);
    expect(s1.accommodation).toBe(40);
    expect(s1.wage).toBe(60);
  });

  it("includes a section that has only an accommodation deduction (zero earnings)", () => {
    const rows = computeWagesBySection(sectionBreakdownAccInput);
    const s2 = rows.find((r) => r.sectionId === "s2")!;
    expect(s2).toBeDefined();
    expect(s2.earnings).toBe(0);
    expect(s2.accommodation).toBe(25);
    expect(s2.wage).toBe(-25);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/portal/wages.test.ts -t "computeWagesBySection accommodation"`
Expected: FAIL — `s1.accommodation` is `undefined` (field doesn't exist) and `s2` is `undefined` (zero-earnings sections are dropped and accommodation is forced to `[]`).

- [ ] **Step 3: Extend `SectionWageRow`**

In `lib/portal/wages.ts`, update the interface:

```ts
export interface SectionWageRow {
  sectionId: string;
  sectionName: string;
  tie: number;
  connect: number;
  earnings: number;
  accommodation: number;
  wage: number;
}
```

- [ ] **Step 4: Use real accommodations and include accommodation-only sections**

In `lib/portal/wages.ts`, replace the body of the `computeWagesBySection` loop. Update the JSDoc line about accommodation, then:

```ts
export function computeWagesBySection(
  input: WageInput & { sections: { id: string; name: string }[] },
): SectionWageRow[] {
  const results: SectionWageRow[] = [];
  for (const section of input.sections) {
    const row = computeWages({ ...input, sectionId: section.id }).rows[0];
    if (!row || (row.earnings === 0 && row.accommodation === 0)) continue;
    results.push({
      sectionId: section.id,
      sectionName: section.name,
      tie: row.breakdown.tie,
      connect: row.breakdown.connect,
      earnings: row.earnings,
      accommodation: row.accommodation,
      wage: row.wage,
    });
  }
  return results;
}
```

(Note: the previous version passed `accommodations: []`; now it passes them through so `computeWages` can filter by `sectionId`.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/portal/wages.test.ts -t "computeWagesBySection"`
Expected: PASS — both the new accommodation tests and the existing `computeWagesBySection` tests (which use `accommodations: []`, so accommodation is `0`) are green.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS (whole vitest suite green).

- [ ] **Step 7: Commit**

```bash
git add lib/portal/wages.ts lib/portal/wages.test.ts
git commit -m "feat(wages): include section accommodation and net in computeWagesBySection"
```

---

## Task 3: Wage math — `sumPaidAdvances` helper

**Files:**
- Modify: `lib/portal/wages.ts`
- Test: `lib/portal/wages.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `lib/portal/wages.test.ts` (and add `sumPaidAdvances` to the import on line 2):

```ts
describe("sumPaidAdvances", () => {
  const advs = [
    { amount: 100, status: "PAID", paidAt: new Date("2026-05-10") },
    { amount: 50, status: "PAID", paidAt: new Date("2026-04-10") },   // out of range
    { amount: 30, status: "APPROVED", paidAt: null },
    { amount: 20, status: "REQUESTED", paidAt: null },
  ];

  it("sums only PAID advances with paidAt inside the range", () => {
    expect(sumPaidAdvances(advs, new Date("2026-05-01"), new Date("2026-05-31"))).toBe(100);
  });

  it("ignores PAID advances with a null paidAt", () => {
    expect(sumPaidAdvances([{ amount: 99, status: "PAID", paidAt: null }], new Date("2026-05-01"), new Date("2026-05-31"))).toBe(0);
  });

  it("returns 0 for an empty list", () => {
    expect(sumPaidAdvances([], new Date("2026-05-01"), new Date("2026-05-31"))).toBe(0);
  });
});
```

Update the import line at the top of the file to:

```ts
import { computeWages, computeWagesByProject, computeWagesBySection, sumWageRows, sumPaidAdvances, type WageInput, type WageRow } from "./wages";
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/portal/wages.test.ts -t "sumPaidAdvances"`
Expected: FAIL — `sumPaidAdvances is not a function` / not exported.

- [ ] **Step 3: Implement `sumPaidAdvances`**

Append to `lib/portal/wages.ts`:

```ts
/**
 * Sums the amount of PAID advances whose `paidAt` falls within [from, to].
 * Advances are general (not tied to a project/section); they are deducted from
 * the worker's net at the page level, gated by paid date like other range-based
 * figures. Currency mixing is out of scope (amounts are summed as-is).
 */
export function sumPaidAdvances(
  advances: { amount: number; status: string; paidAt: Date | null }[],
  from: Date,
  to: Date,
): number {
  let total = 0;
  for (const a of advances) {
    if (a.status !== "PAID" || !a.paidAt) continue;
    if (a.paidAt < from || a.paidAt > to) continue;
    total += a.amount;
  }
  return total;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/portal/wages.test.ts -t "sumPaidAdvances"`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/portal/wages.ts lib/portal/wages.test.ts
git commit -m "feat(wages): add sumPaidAdvances helper"
```

---

## Task 4: Prisma schema — new models, enum, accommodation.sectionId

**Files:**
- Modify: `prisma/schema.prisma`
- Create (generated): `prisma/migrations/*_add_section_invoice_advance/migration.sql`

- [ ] **Step 1: Add the `AdvanceStatus` enum**

In `prisma/schema.prisma`, after the `InquiryStatus` enum block, add:

```prisma
enum AdvanceStatus {
  REQUESTED
  APPROVED
  REJECTED
  PAID
}
```

- [ ] **Step 2: Add `sectionId` + relation to `Accommodation`**

In the `Accommodation` model, add the field and relation (place near `projectId`/`project`) and add the index alongside the existing `@@index` lines:

```prisma
  sectionId String?
  section   Section? @relation(fields: [sectionId], references: [id], onDelete: SetNull)
```

and add this index line with the others at the bottom of the model:

```prisma
  @@index([sectionId])
```

- [ ] **Step 3: Add reverse relations to `Section`, `ProjectWorker`, `User`**

In `Section`, add:

```prisma
  invoices       SectionInvoice[]
  accommodations Accommodation[]
```

In `ProjectWorker`, add:

```prisma
  sectionInvoices SectionInvoice[]
```

In `User`, add:

```prisma
  advanceRequests AdvanceRequest[]
```

- [ ] **Step 4: Add the two new models**

At the end of `prisma/schema.prisma`, add:

```prisma
model SectionInvoice {
  id              String   @id @default(cuid())
  sectionId       String
  projectWorkerId String
  invoicedAt      DateTime @default(now())

  section       Section       @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  projectWorker ProjectWorker @relation(fields: [projectWorkerId], references: [id], onDelete: Cascade)

  @@unique([sectionId, projectWorkerId])
  @@index([projectWorkerId])
}

model AdvanceRequest {
  id          String        @id @default(cuid())
  userId      String
  amount      Decimal       @db.Decimal(10, 2)
  currency    Currency      @default(EUR)
  note        String?
  status      AdvanceStatus @default(REQUESTED)
  requestedAt DateTime      @default(now())
  decidedAt   DateTime?
  paidAt      DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
}
```

- [ ] **Step 5: Create and apply the migration**

Run: `npx prisma migrate dev --name add_section_invoice_advance`
Expected: Prisma creates `prisma/migrations/<timestamp>_add_section_invoice_advance/migration.sql`, applies it, and regenerates the client with no errors.

- [ ] **Step 6: Verify the client typechecks**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors; `prisma.sectionInvoice`, `prisma.advanceRequest`, `AdvanceStatus` now exist).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add SectionInvoice, AdvanceRequest, Accommodation.sectionId"
```

---

## Task 5: RLS policies + grants for the new tables

**Files:**
- Create: `prisma/migrations/*_rls_section_invoice_advance/migration.sql`
- Modify: `scripts/setup-rls-role.sql`

- [ ] **Step 1: Create an empty migration**

Run: `npx prisma migrate dev --create-only --name rls_section_invoice_advance`
Expected: Prisma creates a new migration folder with an empty (or no-op) `migration.sql` because the schema is unchanged.

- [ ] **Step 2: Write the RLS SQL**

Replace the contents of the new `prisma/migrations/<timestamp>_rls_section_invoice_advance/migration.sql` with:

```sql
-- Worker RLS for the new payroll tables. RLS is ENABLEd (not FORCEd): the owner
-- role the app/Prisma connect as bypasses these policies; only `qs_worker` is
-- constrained. Writes happen through the owner connection in server actions.

-- SectionInvoice: a worker sees only invoices tied to their own ProjectWorker
-- rows (ProjectWorker is itself RLS-scoped to the current worker).
ALTER TABLE "SectionInvoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_section_invoice ON "SectionInvoice"
  FOR SELECT
  USING ("projectWorkerId" IN (SELECT id FROM "ProjectWorker"));

-- AdvanceRequest: a worker sees only their own requests.
ALTER TABLE "AdvanceRequest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_advance_request ON "AdvanceRequest"
  FOR SELECT
  USING ("userId" = current_setting('app.user_id', true));

-- The restricted worker role gets SELECT only on the new tables.
GRANT SELECT ON "SectionInvoice", "AdvanceRequest" TO qs_worker;
```

- [ ] **Step 3: Apply the migration**

Run: `npx prisma migrate dev`
Expected: the RLS migration applies with no errors. (If the local DB has no `qs_worker` role, the `GRANT` will error — in that case run `psql "$DATABASE_URL" -v worker_password=... -f scripts/setup-rls-role.sql` once first, then re-run. Document this in the commit if needed.)

- [ ] **Step 4: Add the new tables to the role setup script**

In `scripts/setup-rls-role.sql`, extend the `GRANT SELECT ON ... TO qs_worker;` list to include the two new tables:

```sql
GRANT SELECT ON
  "User",
  "Project",
  "Section",
  "Table",
  "ProjectWorker",
  "ActivityLog",
  "Accommodation",
  "AccommodationWorker",
  "SectionInvoice",
  "AdvanceRequest"
TO qs_worker;
```

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations scripts/setup-rls-role.sql
git commit -m "feat(db): RLS SELECT policies + grants for SectionInvoice and AdvanceRequest"
```

---

## Task 6: Server action — toggle section invoiced (worker)

**Files:**
- Create: `lib/actions/section-invoice.ts`

- [ ] **Step 1: Write the action**

Create `lib/actions/section-invoice.ts`:

```ts
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const schema = z.object({ sectionId: z.string().min(1) });

export type ToggleInvoiceResult =
  | { ok: true; invoiced: boolean; invoicedAt: string | null }
  | { ok: false; error: "validation" | "not-assigned" };

/**
 * Worker self-service: toggles whether the current worker has invoiced their
 * own earnings for one section. Creates the SectionInvoice row if missing,
 * deletes it if present. Scoped to the worker's own ProjectWorker.
 */
export async function toggleSectionInvoiceAction(fd: FormData): Promise<ToggleInvoiceResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "validation" };

  const parsed = schema.safeParse({ sectionId: fd.get("sectionId") });
  if (!parsed.success) return { ok: false, error: "validation" };

  const section = await prisma.section.findUnique({
    where: { id: parsed.data.sectionId },
    select: { id: true, projectId: true },
  });
  if (!section) return { ok: false, error: "validation" };

  const pw = await prisma.projectWorker.findUnique({
    where: { projectId_userId: { projectId: section.projectId, userId: session.user.id } },
    select: { id: true },
  });
  if (!pw) return { ok: false, error: "not-assigned" };

  const existing = await prisma.sectionInvoice.findUnique({
    where: { sectionId_projectWorkerId: { sectionId: section.id, projectWorkerId: pw.id } },
  });

  if (existing) {
    await prisma.sectionInvoice.delete({ where: { id: existing.id } });
    return { ok: true, invoiced: false, invoicedAt: null };
  }

  const created = await prisma.sectionInvoice.create({
    data: { sectionId: section.id, projectWorkerId: pw.id },
  });
  return { ok: true, invoiced: true, invoicedAt: created.invoicedAt.toISOString() };
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/section-invoice.ts
git commit -m "feat(portal): toggleSectionInvoiceAction for worker section invoicing"
```

---

## Task 7: Server actions — advances (worker + admin)

**Files:**
- Create: `lib/actions/advances.ts`

- [ ] **Step 1: Write the actions**

Create `lib/actions/advances.ts`:

```ts
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/portal/session";
import { Currency } from "@prisma/client";

export type AdvanceResult = { ok: true } | { ok: false; error: "validation" | "forbidden" | "bad-state" };

const requestSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.enum(["USD", "EUR"]),
  note: z.string().trim().optional(),
});

/** Worker creates an advance request in REQUESTED state. */
export async function requestAdvanceAction(fd: FormData): Promise<AdvanceResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "forbidden" };

  const parsed = requestSchema.safeParse({
    amount: fd.get("amount"),
    currency: fd.get("currency") || "EUR",
    note: fd.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "validation" };

  await prisma.advanceRequest.create({
    data: {
      userId: session.user.id,
      amount: parsed.data.amount,
      currency: parsed.data.currency as Currency,
      note: parsed.data.note ?? null,
    },
  });
  return { ok: true };
}

/** Worker cancels their own request, only while still REQUESTED. */
export async function cancelAdvanceAction(fd: FormData): Promise<AdvanceResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "forbidden" };
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, error: "validation" };

  const adv = await prisma.advanceRequest.findUnique({ where: { id } });
  if (!adv || adv.userId !== session.user.id) return { ok: false, error: "forbidden" };
  if (adv.status !== "REQUESTED") return { ok: false, error: "bad-state" };

  await prisma.advanceRequest.delete({ where: { id } });
  return { ok: true };
}

const decideSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
});

/** Admin approves or rejects a REQUESTED advance. */
export async function decideAdvanceAction(fd: FormData): Promise<AdvanceResult> {
  await requireAdmin();
  const parsed = decideSchema.safeParse({ id: fd.get("id"), decision: fd.get("decision") });
  if (!parsed.success) return { ok: false, error: "validation" };

  const adv = await prisma.advanceRequest.findUnique({ where: { id: parsed.data.id } });
  if (!adv) return { ok: false, error: "validation" };
  if (adv.status !== "REQUESTED") return { ok: false, error: "bad-state" };

  await prisma.advanceRequest.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.decision === "approve" ? "APPROVED" : "REJECTED",
      decidedAt: new Date(),
    },
  });
  return { ok: true };
}

/** Admin marks an APPROVED advance as PAID. */
export async function markAdvancePaidAction(fd: FormData): Promise<AdvanceResult> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, error: "validation" };

  const adv = await prisma.advanceRequest.findUnique({ where: { id } });
  if (!adv) return { ok: false, error: "validation" };
  if (adv.status !== "APPROVED") return { ok: false, error: "bad-state" };

  await prisma.advanceRequest.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });
  return { ok: true };
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/advances.ts
git commit -m "feat(portal): advance request/cancel/decide/mark-paid actions"
```

---

## Task 8: Accommodation form — assign to a section (admin)

**Files:**
- Modify: `lib/actions/accommodations.ts`
- Modify: `app/[locale]/(portal)/accommodations/AccommodationForm.tsx`
- Modify: `app/[locale]/(portal)/accommodations/new/page.tsx`
- Modify: `app/[locale]/(portal)/accommodations/[id]/page.tsx`

- [ ] **Step 1: Accept and validate `sectionId` in the action**

In `lib/actions/accommodations.ts`, add `sectionId` to the zod schema (after `notes`):

```ts
  sectionId: z.string().optional().nullable(),
```

Add it to the `safeParse` object (after `notes`):

```ts
    sectionId: fd.get("sectionId") || null,
```

Then, right after the `if (!parsed.success) return ...` line, validate that the section (if any) belongs to the chosen project:

```ts
  const sectionId = parsed.data.sectionId || null;
  if (sectionId) {
    const section = await prisma.section.findUnique({ where: { id: sectionId }, select: { projectId: true } });
    if (!section || section.projectId !== (parsed.data.projectId || null)) {
      return { ok: false as const, error: "validation" };
    }
  }
```

Add `sectionId` to the `data` object:

```ts
  const data = {
    projectId: parsed.data.projectId || null,
    name: parsed.data.name,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
    totalCost: parsed.data.totalCost,
    currency: parsed.data.currency as Currency,
    notes: parsed.data.notes ?? null,
    sectionId,
  };
```

- [ ] **Step 2: Pass sections into the form (new + edit pages)**

In `app/[locale]/(portal)/accommodations/new/page.tsx`, extend the `Promise.all` and the props. Replace the body's data loading + render with:

```tsx
  const [workers, projects, sections] = await Promise.all([
    prisma.user.findMany({ where: { active: true, role: "WORKER" }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.section.findMany({ orderBy: { orderIndex: "asc" }, select: { id: true, name: true, projectId: true } }),
  ]);
  const t = await getTranslations("accommodations");
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("new")}</h1>
      <AccommodationForm
        workers={workers.map((w) => ({ id: w.id, name: w.name, email: w.email ?? w.username }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        sections={sections}
        selectedWorkerIds={[]}
      />
    </div>
  );
```

In `app/[locale]/(portal)/accommodations/[id]/page.tsx`, add `sections` to the `Promise.all`:

```tsx
  const [workers, projects, sections] = await Promise.all([
    prisma.user.findMany({ where: { active: true, role: "WORKER" }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.section.findMany({ orderBy: { orderIndex: "asc" }, select: { id: true, name: true, projectId: true } }),
  ]);
```

Add `sectionId: acc.sectionId` to the `initial` prop object, and pass `sections={sections}` and `projects={...}` to `<AccommodationForm>`:

```tsx
      <AccommodationForm
        initial={{
          id: acc.id,
          projectId: acc.projectId,
          name: acc.name,
          startDate: acc.startDate.toISOString().slice(0, 10),
          endDate: acc.endDate.toISOString().slice(0, 10),
          totalCost: Number(acc.totalCost),
          currency: acc.currency as "USD" | "EUR",
          notes: acc.notes,
          sectionId: acc.sectionId,
        }}
        workers={workers.map((w) => ({ id: w.id, name: w.name, email: w.email ?? w.username }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        sections={sections}
        selectedWorkerIds={acc.workers.map((w) => w.userId)}
      />
```

- [ ] **Step 3: Add the Section select to the form**

In `app/[locale]/(portal)/accommodations/AccommodationForm.tsx`:

Add `sectionId` to the `initial` type and add a `sections` prop + selected-project state. Update the props type:

```tsx
  initial?: {
    id: string;
    projectId: string | null;
    name: string;
    startDate: string;
    endDate: string;
    totalCost: number;
    currency: "USD" | "EUR";
    notes: string | null;
    sectionId: string | null;
  };
  workers: { id: string; name: string; email: string }[];
  projects: { id: string; name: string }[];
  sections: { id: string; name: string; projectId: string }[];
  selectedWorkerIds: string[];
```

Add state for the selected project so the section options can filter (place with the other `useState` calls):

```tsx
  const [projectId, setProjectId] = useState<string>(initial?.projectId ?? "");
```

Replace the existing Project `FormSelect` with a controlled one, and add the Section `FormSelect` right after it:

```tsx
      <FormSelect
        label="Project"
        name="projectId"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        options={[{ value: "", label: "— none —" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
      />
      <FormSelect
        label="Section"
        name="sectionId"
        defaultValue={initial?.sectionId ?? ""}
        key={projectId}
        options={[
          { value: "", label: "— none —" },
          ...sections.filter((s) => s.projectId === projectId).map((s) => ({ value: s.id, label: s.name })),
        ]}
      />
```

(The `key={projectId}` remounts the Section select when the project changes so it resets to "— none —". Labels are hardcoded to match the existing hardcoded "Project"/"Workers" labels in this form.)

- [ ] **Step 4: Make `FormSelect` support a controlled value**

In `components/portal/FormSelect.tsx`, add optional `value`/`onChange` to the props and pass them through (keep `defaultValue` working when `value` is absent):

```tsx
export function FormSelect({
  label,
  name,
  options,
  defaultValue,
  value,
  onChange,
  required,
  error,
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  error?: string;
}) {
```

In the `<select>`, replace the `defaultValue={defaultValue}` line with:

```tsx
        {...(value !== undefined ? { value, onChange } : { defaultValue })}
```

- [ ] **Step 5: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/accommodations.ts app/[locale]/\(portal\)/accommodations components/portal/FormSelect.tsx
git commit -m "feat(portal): assign an accommodation to a section in the admin form"
```

---

## Task 9: Section wages API — return accommodation + invoiced

**Files:**
- Create: `app/[locale]/(portal)/wages/section-row.ts`
- Modify: `app/api/wages/projects/[projectId]/sections/route.ts`

- [ ] **Step 1: Add the shared row type**

Create `app/[locale]/(portal)/wages/section-row.ts`:

```ts
import type { SectionWageRow } from "@/lib/portal/wages";

/** A section wage row plus this worker's invoiced status for that section. */
export type WorkerSectionRow = SectionWageRow & {
  invoiced: boolean;
  invoicedAt: string | null;
};
```

- [ ] **Step 2: Load accommodations + invoices and merge into the response**

In `app/api/wages/projects/[projectId]/sections/route.ts`, extend the `withWorkerScope` block to also load accommodations and this worker's section invoices, then pass accommodations into `computeWagesBySection` and merge the invoiced flag. Replace from the `const data = await withWorkerScope(...)` block to the end of the file:

```ts
  const data = await withWorkerScope(userId, async (tx) => {
    const [prices, activity, sections, accommodations, invoices] = await Promise.all([
      tx.projectWorker.findMany({ where: { projectId, userId } }),
      tx.activityLog.findMany({
        where: {
          table: { section: { projectId } },
          workDate: { gte: from, lte: to },
        },
        include: { projectWorker: true, table: { include: { section: true } } },
      }),
      tx.section.findMany({ where: { projectId }, orderBy: { orderIndex: "asc" } }),
      tx.accommodation.findMany({
        where: { projectId, startDate: { lte: to }, endDate: { gte: from } },
        include: { workers: true },
      }),
      tx.sectionInvoice.findMany({
        where: { projectWorker: { projectId, userId } },
        select: { sectionId: true, invoicedAt: true },
      }),
    ]);
    return { prices, activity, sections, accommodations, invoices };
  });

  const sectionRows = computeWagesBySection({
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
    accommodations: data.accommodations.map((acc) => ({
      id: acc.id,
      totalCost: Number(acc.totalCost),
      currency: acc.currency,
      startDate: acc.startDate,
      endDate: acc.endDate,
      workerIds: acc.workers.map((w) => w.userId),
      projectId: acc.projectId,
      sectionId: acc.sectionId,
    })),
    sections: data.sections.map((s) => ({ id: s.id, name: s.name })),
  });

  const invoicedAt = new Map(data.invoices.map((i) => [i.sectionId, i.invoicedAt.toISOString()] as const));
  const sections: WorkerSectionRow[] = sectionRows.map((s) => ({
    ...s,
    invoiced: invoicedAt.has(s.sectionId),
    invoicedAt: invoicedAt.get(s.sectionId) ?? null,
  }));

  return NextResponse.json({ sections });
}
```

Add the import at the top of the file:

```ts
import type { WorkerSectionRow } from "@/app/[locale]/(portal)/wages/section-row";
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(portal)/wages/section-row.ts" "app/api/wages/projects/[projectId]/sections/route.ts"
git commit -m "feat(wages): section API returns accommodation, net, and invoiced status"
```

---

## Task 10: i18n — add all new keys (5 locales)

**Files:**
- Modify: `messages/en.json`, `messages/sk.json`, `messages/de.json`, `messages/fr.json`, `messages/sv.json`

- [ ] **Step 1: Add the `nav.advances` key**

In each file, inside the `nav` object, add an `advances` entry:

- en: `"advances": "Advances"`
- sk: `"advances": "Zálohy"`
- de: `"advances": "Vorschüsse"`
- fr: `"advances": "Avances"`
- sv: `"advances": "Förskott"`

- [ ] **Step 2: Add the new `wages` keys**

In each file, inside the `wages` object, add:

- en: `"invoiced": "Invoiced", "advances": "Advances", "netToPay": "Net to pay", "net": "Net"`
- sk: `"invoiced": "Vyfakturované", "advances": "Zálohy", "netToPay": "Na vyplatenie", "net": "Čisté"`
- de: `"invoiced": "Fakturiert", "advances": "Vorschüsse", "netToPay": "Auszuzahlen", "net": "Netto"`
- fr: `"invoiced": "Facturé", "advances": "Avances", "netToPay": "Net à payer", "net": "Net"`
- sv: `"invoiced": "Fakturerad", "advances": "Förskott", "netToPay": "Att betala", "net": "Netto"`

- [ ] **Step 3: Add the `advances` namespace**

In each file, add a new top-level `advances` object:

en:
```json
  "advances": {
    "title": "Advances",
    "request": "Request advance",
    "amount": "Amount",
    "note": "Note",
    "mine": "My requests",
    "allRequests": "All requests",
    "noRequests": "No advance requests yet.",
    "worker": "Worker",
    "requestedAt": "Requested",
    "decidedAt": "Decided",
    "paidAt": "Paid",
    "approve": "Approve",
    "reject": "Reject",
    "markPaid": "Mark paid",
    "cancel": "Cancel",
    "confirmCancel": "Cancel this request?",
    "status": { "REQUESTED": "Requested", "APPROVED": "Approved", "REJECTED": "Rejected", "PAID": "Paid" }
  }
```

sk:
```json
  "advances": {
    "title": "Zálohy",
    "request": "Požiadať o zálohu",
    "amount": "Suma",
    "note": "Poznámka",
    "mine": "Moje žiadosti",
    "allRequests": "Všetky žiadosti",
    "noRequests": "Zatiaľ žiadne žiadosti o zálohu.",
    "worker": "Pracovník",
    "requestedAt": "Požiadané",
    "decidedAt": "Rozhodnuté",
    "paidAt": "Vyplatené",
    "approve": "Schváliť",
    "reject": "Zamietnuť",
    "markPaid": "Označiť vyplatené",
    "cancel": "Zrušiť",
    "confirmCancel": "Zrušiť túto žiadosť?",
    "status": { "REQUESTED": "Požiadané", "APPROVED": "Schválené", "REJECTED": "Zamietnuté", "PAID": "Vyplatené" }
  }
```

de:
```json
  "advances": {
    "title": "Vorschüsse",
    "request": "Vorschuss anfordern",
    "amount": "Betrag",
    "note": "Notiz",
    "mine": "Meine Anfragen",
    "allRequests": "Alle Anfragen",
    "noRequests": "Noch keine Vorschussanfragen.",
    "worker": "Mitarbeiter",
    "requestedAt": "Angefordert",
    "decidedAt": "Entschieden",
    "paidAt": "Bezahlt",
    "approve": "Genehmigen",
    "reject": "Ablehnen",
    "markPaid": "Als bezahlt markieren",
    "cancel": "Stornieren",
    "confirmCancel": "Diese Anfrage stornieren?",
    "status": { "REQUESTED": "Angefordert", "APPROVED": "Genehmigt", "REJECTED": "Abgelehnt", "PAID": "Bezahlt" }
  }
```

fr:
```json
  "advances": {
    "title": "Avances",
    "request": "Demander une avance",
    "amount": "Montant",
    "note": "Note",
    "mine": "Mes demandes",
    "allRequests": "Toutes les demandes",
    "noRequests": "Aucune demande d'avance pour le moment.",
    "worker": "Ouvrier",
    "requestedAt": "Demandé",
    "decidedAt": "Décidé",
    "paidAt": "Payé",
    "approve": "Approuver",
    "reject": "Rejeter",
    "markPaid": "Marquer payé",
    "cancel": "Annuler",
    "confirmCancel": "Annuler cette demande ?",
    "status": { "REQUESTED": "Demandée", "APPROVED": "Approuvée", "REJECTED": "Rejetée", "PAID": "Payée" }
  }
```

sv:
```json
  "advances": {
    "title": "Förskott",
    "request": "Begär förskott",
    "amount": "Belopp",
    "note": "Anteckning",
    "mine": "Mina förfrågningar",
    "allRequests": "Alla förfrågningar",
    "noRequests": "Inga förskottsförfrågningar än.",
    "worker": "Arbetare",
    "requestedAt": "Begärd",
    "decidedAt": "Beslutad",
    "paidAt": "Betald",
    "approve": "Godkänn",
    "reject": "Avvisa",
    "markPaid": "Markera betald",
    "cancel": "Avbryt",
    "confirmCancel": "Avbryt denna förfrågan?",
    "status": { "REQUESTED": "Begärd", "APPROVED": "Godkänd", "REJECTED": "Avvisad", "PAID": "Betald" }
  }
```

- [ ] **Step 4: Verify all five files are valid JSON**

Run: `node -e "for (const l of ['en','sk','de','fr','sv']) { const m=require('./messages/'+l+'.json'); if(!m.advances?.title || !m.nav.advances || !m.wages.invoiced) throw new Error('missing keys in '+l); } console.log('i18n ok')"`
Expected: prints `i18n ok`.

- [ ] **Step 5: Commit**

```bash
git add messages
git commit -m "i18n: add advances namespace, nav.advances, and wages invoiced/net keys"
```

---

## Task 11: Nav — add Advances for both roles

**Files:**
- Modify: `lib/portal-nav.ts`

- [ ] **Step 1: Add the nav item**

In `lib/portal-nav.ts`, add `"advances"` to the `labelKey` union type:

```ts
  labelKey:
    | "dashboard"
    | "projects"
    | "workers"
    | "accommodations"
    | "wages"
    | "advances"
    | "applications"
    | "inquiries";
```

Add the item to both arrays. In the ADMIN array, after the `wages` entry:

```ts
      { href: "/advances", labelKey: "advances" },
```

In the WORKER array, after the `wages` entry:

```ts
    { href: "/advances", labelKey: "advances" },
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/portal-nav.ts
git commit -m "feat(portal): add Advances nav item for both roles"
```

---

## Task 12: Advances screens (worker + admin)

**Files:**
- Create: `app/[locale]/(portal)/advances/page.tsx`
- Create: `app/[locale]/(portal)/advances/MyAdvancesView.tsx`
- Create: `app/[locale]/(portal)/advances/AdminAdvancesView.tsx`

- [ ] **Step 1: Create the worker view (form + own list)**

Create `app/[locale]/(portal)/advances/MyAdvancesView.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { FormSelect } from "@/components/portal/FormSelect";
import { DataTable } from "@/components/portal/DataTable";
import { requestAdvanceAction, cancelAdvanceAction } from "@/lib/actions/advances";

type Row = {
  id: string;
  amount: string;
  currency: string;
  note: string | null;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";
  requestedAt: string;
};

export function MyAdvancesView({ requests }: { requests: Row[] }) {
  const t = useTranslations("advances");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    start(async () => {
      const r = await requestAdvanceAction(fd);
      if (r.ok) {
        form.reset();
        router.refresh();
      } else {
        setError(tCommon("saveError"));
      }
    });
  }

  function onCancel(id: string) {
    if (!window.confirm(t("confirmCancel"))) return;
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      const r = await cancelAdvanceAction(fd);
      if (r.ok) router.refresh();
      else setError(tCommon("deleteError"));
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="space-y-5 max-w-md">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("amount")} name="amount" type="number" step="0.01" required />
          <FormSelect
            label={tCommon("currency")}
            name="currency"
            defaultValue="EUR"
            options={[{ value: "EUR", label: "EUR" }, { value: "USD", label: "USD" }]}
          />
        </div>
        <FormField label={t("note")} name="note" />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="primary" disabled={pending}>{t("request")}</Button>
      </form>

      <div>
        <h2 className="text-sm uppercase tracking-[0.15em] font-semibold text-navy/70 mb-3">{t("mine")}</h2>
        <DataTable
          headers={[t("amount"), tCommon("currency"), tCommon("status"), t("requestedAt"), t("note"), tCommon("actions")]}
          empty={t("noRequests")}
          rows={requests.map((r) => [
            r.amount,
            r.currency,
            t(`status.${r.status}`),
            r.requestedAt,
            r.note ?? "—",
            r.status === "REQUESTED" ? (
              <button key={r.id} onClick={() => onCancel(r.id)} disabled={pending} className="text-red-600 underline">
                {t("cancel")}
              </button>
            ) : "—",
          ])}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the admin view (all requests + actions)**

Create `app/[locale]/(portal)/advances/AdminAdvancesView.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import { decideAdvanceAction, markAdvancePaidAction } from "@/lib/actions/advances";

type Row = {
  id: string;
  workerName: string;
  amount: string;
  currency: string;
  note: string | null;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";
  requestedAt: string;
};

export function AdminAdvancesView({ requests }: { requests: Row[] }) {
  const t = useTranslations("advances");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (fd: FormData) => Promise<{ ok: boolean }>, id: string, extra?: Record<string, string>) {
    const fd = new FormData();
    fd.set("id", id);
    for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
    setError(null);
    start(async () => {
      const r = await action(fd);
      if (r.ok) router.refresh();
      else setError(tCommon("saveError"));
    });
  }

  function actionsFor(r: Row) {
    if (r.status === "REQUESTED") {
      return (
        <span className="flex gap-3">
          <button onClick={() => run(decideAdvanceAction, r.id, { decision: "approve" })} disabled={pending} className="text-navy underline">{t("approve")}</button>
          <button onClick={() => run(decideAdvanceAction, r.id, { decision: "reject" })} disabled={pending} className="text-red-600 underline">{t("reject")}</button>
        </span>
      );
    }
    if (r.status === "APPROVED") {
      return <button onClick={() => run(markAdvancePaidAction, r.id)} disabled={pending} className="text-navy underline">{t("markPaid")}</button>;
    }
    return <span className="text-muted">—</span>;
  }

  return (
    <div>
      {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}
      <DataTable
        headers={[t("worker"), t("amount"), tCommon("currency"), tCommon("status"), t("requestedAt"), t("note"), tCommon("actions")]}
        empty={t("noRequests")}
        rows={requests.map((r) => [
          r.workerName,
          r.amount,
          r.currency,
          t(`status.${r.status}`),
          r.requestedAt,
          r.note ?? "—",
          actionsFor(r),
        ])}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create the role-aware page**

Create `app/[locale]/(portal)/advances/page.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { withWorkerScope } from "@/lib/prisma-worker";
import { requireUser } from "@/lib/portal/session";
import { MyAdvancesView } from "./MyAdvancesView";
import { AdminAdvancesView } from "./AdminAdvancesView";

export default async function AdvancesPage() {
  const user = await requireUser();
  const t = await getTranslations("advances");

  if (user.role !== "ADMIN") {
    const rows = await withWorkerScope(user.id, (tx) =>
      tx.advanceRequest.findMany({ orderBy: { requestedAt: "desc" } }),
    );
    return (
      <div>
        <h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>
        <MyAdvancesView
          requests={rows.map((r) => ({
            id: r.id,
            amount: Number(r.amount).toFixed(2),
            currency: r.currency,
            note: r.note,
            status: r.status,
            requestedAt: r.requestedAt.toLocaleDateString(),
          }))}
        />
      </div>
    );
  }

  const rows = await prisma.advanceRequest.findMany({
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
    include: { user: true },
  });
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>
      <AdminAdvancesView
        requests={rows.map((r) => ({
          id: r.id,
          workerName: r.user.name,
          amount: Number(r.amount).toFixed(2),
          currency: r.currency,
          note: r.note,
          status: r.status,
          requestedAt: r.requestedAt.toLocaleDateString(),
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(portal)/advances"
git commit -m "feat(portal): advances screens for worker (request/cancel) and admin (approve/reject/pay)"
```

---

## Task 13: Worker wages view — section columns, invoiced toggle, advances/net totals

**Files:**
- Modify: `app/[locale]/(portal)/wages/page.tsx`
- Modify: `app/[locale]/(portal)/wages/MyWagesView.tsx`
- Modify: `app/[locale]/(portal)/wages/WorkerSectionBreakdown.tsx`

- [ ] **Step 1: Load paid advances in the worker branch of the wages page**

In `app/[locale]/(portal)/wages/page.tsx`, add `sumPaidAdvances` to the import from `@/lib/portal/wages`. Inside the worker branch (`if (user.role !== "ADMIN")`), add `advanceRequest` to the `withWorkerScope` query and compute the total. In the `Promise.all`, add:

```ts
        tx.advanceRequest.findMany({ where: { status: "PAID", paidAt: { gte: from, lte: to } } }),
```

and capture it in the returned object, e.g. update the destructure/return to include `advances`:

```ts
      const [prices, activity, accommodations, projects, advances] = await Promise.all([
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
        tx.advanceRequest.findMany({ where: { status: "PAID", paidAt: { gte: from, lte: to } } }),
      ]);
      return { prices, activity, accommodations, projects, advances };
```

After the `computeWagesByProject(...)` call, compute the advances total:

```ts
    const advancesTotal = sumPaidAdvances(
      data.advances.map((a) => ({ amount: Number(a.amount), status: a.status, paidAt: a.paidAt })),
      from,
      to,
    );
```

Pass it to the view:

```tsx
        <MyWagesView key={`${fromStr}-${toStr}`} from={fromStr} to={toStr} result={result} advances={advancesTotal} />
```

- [ ] **Step 2: Update `MyWagesView` — advances prop, net total, invoiced toggle, typed cache**

In `app/[locale]/(portal)/wages/MyWagesView.tsx`:

Replace the imports of `SectionWageRow` with the shared row type and add the action import:

```tsx
import type { WageByProjectResult } from "@/lib/portal/wages";
import type { WorkerSectionRow } from "./section-row";
import { toggleSectionInvoiceAction } from "@/lib/actions/section-invoice";
import { WorkerSectionBreakdown } from "./WorkerSectionBreakdown";
```

Update the component signature to accept `advances`:

```tsx
export function MyWagesView({
  from,
  to,
  result,
  advances,
}: {
  from: string;
  to: string;
  result: WageByProjectResult;
  advances: number;
}) {
```

Change the cache type from `SectionWageRow[]` to `WorkerSectionRow[]`:

```tsx
  const [sectionCache, setSectionCache] = useState<Map<string, WorkerSectionRow[]>>(new Map());
```

and the fetch handler's typed parse:

```tsx
      const data: { sections: WorkerSectionRow[] } = await res.json();
```

Add an invoiced-toggle handler (place after `handleToggle`):

```tsx
  function handleInvoiceToggle(projectId: string, sectionId: string) {
    const fd = new FormData();
    fd.set("sectionId", sectionId);
    void (async () => {
      const r = await toggleSectionInvoiceAction(fd);
      if (!r.ok) return;
      setSectionCache((prev) => {
        const next = new Map(prev);
        const rows = (next.get(projectId) ?? []).map((row) =>
          row.sectionId === sectionId ? { ...row, invoiced: r.invoiced, invoicedAt: r.invoicedAt } : row,
        );
        next.set(projectId, rows);
        return next;
      });
    })();
  }
```

Pass the toggle handler down to the breakdown (replace the existing `<WorkerSectionBreakdown .../>` usage):

```tsx
                  {expandedProjects.has(p.projectId) && (
                    <WorkerSectionBreakdown
                      sections={sectionCache.get(p.projectId) ?? []}
                      onToggleInvoice={(sectionId) => handleInvoiceToggle(p.projectId, sectionId)}
                    />
                  )}
```

In the totals block (`hasTotal`), add Advances and Net-to-pay cells. Change the grid to 6 columns and append two `<div>`s after the existing `wage` cell:

```tsx
          <dl className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-sm">
```

and after the `wage` `<div>`:

```tsx
            <div>
              <dt className="text-xs text-muted">{t("advances")}</dt>
              <dd className="font-semibold text-navy">{advances.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("netToPay")}</dt>
              <dd className="font-semibold text-navy">{(result.total.wage - advances).toFixed(2)}</dd>
            </div>
```

Also change the `hasTotal` condition so the totals block shows when there are advances even with no earnings:

```tsx
  const hasTotal = result.total.earnings !== 0 || result.total.accommodation !== 0 || advances !== 0;
```

- [ ] **Step 3: Update `WorkerSectionBreakdown` — accommodation, net, invoiced checkbox**

Replace the contents of `app/[locale]/(portal)/wages/WorkerSectionBreakdown.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import type { WorkerSectionRow } from "./section-row";

export function WorkerSectionBreakdown({
  sections,
  onToggleInvoice,
}: {
  sections: WorkerSectionRow[];
  onToggleInvoice: (sectionId: string) => void;
}) {
  const t = useTranslations("wages");

  if (sections.length === 0) {
    return (
      <tr>
        <td />
        <td colSpan={6} className="px-4 py-2 pl-10 text-sm text-muted italic">
          {t("noData")}
        </td>
      </tr>
    );
  }
  return (
    <>
      {sections.map((s) => (
        <tr key={s.sectionId} className="bg-bg/30">
          <td />
          <td className="px-4 py-2 pl-10 text-sm text-slate-ink">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.invoiced}
                onChange={() => onToggleInvoice(s.sectionId)}
                title={t("invoiced")}
                aria-label={t("invoiced")}
              />
              {s.sectionName}
            </span>
          </td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.tie.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.connect.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.earnings.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.accommodation.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.wage.toFixed(2)}</td>
        </tr>
      ))}
    </>
  );
}
```

(The breakdown now fills all seven columns of the parent table: chevron, name+checkbox, tie, connect, earnings, accommodation, wage.)

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Build to confirm the routes compile**

Run: `npm run build`
Expected: build succeeds (no type/render errors in the wages route).

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(portal)/wages/page.tsx" "app/[locale]/(portal)/wages/MyWagesView.tsx" "app/[locale]/(portal)/wages/WorkerSectionBreakdown.tsx"
git commit -m "feat(wages): per-section accommodation/net, invoiced checkbox, advances + net totals"
```

---

## Task 14: Admin section wage view — accommodation column + invoiced indicator

**Files:**
- Modify: `app/[locale]/(portal)/wages/AdminSectionWageView.tsx`
- Modify: `app/[locale]/(portal)/wages/projects/[projectId]/sections/[sectionId]/page.tsx`

- [ ] **Step 1: Load section accommodations + invoices in the section page**

In `.../sections/[sectionId]/page.tsx`, add two queries to the `Promise.all` (after `activity`):

```ts
    prisma.accommodation.findMany({ where: { sectionId }, include: { workers: true } }),
    prisma.sectionInvoice.findMany({ where: { sectionId }, include: { projectWorker: true } }),
```

Update the destructure to capture them:

```ts
  const [section, project, workers, prices, activity, accommodations, invoices] = await Promise.all([
```

Pass the section accommodations into `computeWages` (replace `accommodations: []`):

```ts
    accommodations: accommodations.map((acc) => ({
      id: acc.id,
      totalCost: Number(acc.totalCost),
      currency: acc.currency,
      startDate: acc.startDate,
      endDate: acc.endDate,
      workerIds: acc.workers.map((w) => w.userId),
      projectId,
      sectionId,
    })),
```

Build an invoiced-by-user map and include `accommodation` + `invoicedAt` in `workerRows`, and widen the filter to keep accommodation-only rows:

```ts
  const invoicedByUser = new Map(invoices.map((i) => [i.projectWorker.userId, i.invoicedAt.toISOString()] as const));

  const workerRows = result.rows
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      tie: r.breakdown.tie,
      connect: r.breakdown.connect,
      earnings: r.earnings,
      accommodation: r.accommodation,
      invoicedAt: invoicedByUser.get(r.userId) ?? null,
      warnings: r.warnings,
    }))
    .filter((r) => r.earnings !== 0 || r.accommodation !== 0);
```

- [ ] **Step 2: Add columns to `AdminSectionWageView`**

Replace the contents of `app/[locale]/(portal)/wages/AdminSectionWageView.tsx`:

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
  accommodation: number;
  invoicedAt: string | null;
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
        headers={[tCommon("name"), t("tie"), t("connect"), t("earnings"), t("accommodation"), t("invoiced")]}
        empty={t("noActivityYet")}
        rows={workers.map((w) => [
          w.name,
          <NumCell key={`tie-${w.userId}`} value={w.tie} />,
          <NumCell key={`con-${w.userId}`} value={w.connect} />,
          <NumCell key={`ear-${w.userId}`} value={w.earnings} />,
          <NumCell key={`acc-${w.userId}`} value={w.accommodation} />,
          <span key={`inv-${w.userId}`} className="text-sm text-slate-ink">{w.invoicedAt ? `✓ ${w.invoicedAt.slice(0, 10)}` : "—"}</span>,
        ])}
      />
    </>
  );
}
```

- [ ] **Step 2b: Pass `workerRows` unchanged**

The section page already renders `<AdminSectionWageView workers={workerRows} />`; the extended `workerRows` shape now matches `SectionWorkerRow`. No further change to the JSX.

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(portal)/wages/AdminSectionWageView.tsx" "app/[locale]/(portal)/wages/projects/[projectId]/sections/[sectionId]/page.tsx"
git commit -m "feat(wages): admin section view shows accommodation and who invoiced"
```

---

## Task 15: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all vitest tests pass.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors (warnings acceptable if pre-existing).

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build succeeds; `/[locale]/wages`, `/[locale]/advances`, `/[locale]/accommodations` routes compile.

- [ ] **Step 5: Manual smoke test (dev server)**

Run: `npm run dev`, then with seeded data verify:
- Worker → Wages: expand a project → section rows show accommodation + net; ticking "Invoiced" persists across reload; the totals show Advances + Net to pay.
- Worker → Advances: submit a request → it appears as REQUESTED; cancel removes it.
- Admin → Advances: Approve → APPROVED; Mark paid → PAID. Re-open worker Wages with a date range covering the paid date → Net to pay drops by the advance amount.
- Admin → Accommodations → edit: pick a project, then a section, save. Admin → Wages → project → section: the accommodation column shows the deducted amount and the worker's invoiced date.

- [ ] **Step 6: Final commit (if any cleanup)**

```bash
git add -A
git commit -m "chore: per-section payroll, invoicing, advances — verification pass"
```

---

## Self-Review

**Spec coverage:**
- Wages by section (earnings/accommodation/net) → Tasks 2, 9, 13. ✅
- Mark section invoiced (worker, toggle + timestamp, per worker×section) → Tasks 4, 6, 9, 13; admin visibility → Task 14. ✅
- Request advance (worker create/cancel; admin approve/reject/pay; lifecycle REQUESTED→APPROVED/REJECTED→PAID) → Tasks 4, 7, 12. ✅
- Paid advance deducted from net → Tasks 3, 13. ✅
- Accommodation attached to a section, deducted from that section's line → Tasks 1, 4, 8, 9, 14. ✅
- RLS + grants for new tables → Task 5. ✅
- i18n across 5 locales → Task 10. ✅
- Tests for wage-math changes → Tasks 1, 2, 3. ✅

**Type consistency:** `SectionWageRow` (with `accommodation`, `wage`) is defined in Task 2 and consumed via `WorkerSectionRow` (Task 9) in Tasks 13. `toggleSectionInvoiceAction` returns `{ invoiced, invoicedAt }` (Task 6) consumed in Task 13. `WageInput.accommodations[].sectionId` (Task 1) is supplied in Tasks 9 and 14. `AdvanceStatus` values (`REQUESTED/APPROVED/REJECTED/PAID`) are consistent across Tasks 7, 12, 14, and i18n status keys (Task 10). Action result shapes (`{ ok: true } | { ok: false; error }`) match the existing `lib/actions` convention.

**Placeholder scan:** none — every step has concrete code/commands.

**Notes for the implementer:**
- Run tasks in order; Tasks 1–3 (pure logic) and 4–5 (DB) are prerequisites for the rest.
- `npx prisma migrate dev` needs a reachable database (see `.env.local`). The RLS `GRANT` in Task 5 requires the `qs_worker` role to exist — run `scripts/setup-rls-role.sql` once if it doesn't.
- This repo unit-tests pure logic only; UI/action correctness is verified via typecheck, build, and the manual smoke test in Task 15.
