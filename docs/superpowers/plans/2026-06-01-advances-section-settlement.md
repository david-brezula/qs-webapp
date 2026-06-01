# Advances Section-Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework advances into a section-settled module under Wages: each advance is tied (by the admin, at settlement) to the section it's deducted from; track open (paid, not settled) vs settled; deduct settled advances from that section's wage line; move the UI to `/wages/advances`.

**Architecture:** Extends the just-built advances feature on this branch. New `SETTLED` status + `sectionId`/`settledAt` on `AdvanceRequest`. Settled advances are a section-level deduction handled in `computeWagesBySection` (single source of truth, like accommodation). Open advances are shown as an outstanding figure only. The standalone `/advances` route moves under `/wages/advances`; the admin gains Open/Settled/All filtering and Settle/Reopen actions.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 + PostgreSQL, next-auth v5, next-intl v4 (en/sk/de/fr/sv), Tailwind v4, vitest 4, zod 4.

**Spec:** `docs/superpowers/specs/2026-06-01-advances-section-settlement-design.md`

**Worktree:** all paths are under `C:/Users/ASMAEL/.config/superpowers/worktrees/qs-web/portal-section-payroll`. Run every bash command from there. Do not touch the main checkout. Never run `prisma migrate reset` or any destructive DB command; if a migration reports drift/prompts/can't connect, stop and report BLOCKED.

---

## File Structure

**Schema/DB:** `prisma/schema.prisma` (+ generated migration).
**Logic:** `lib/portal/wages.ts` (+ test) — `SectionWageRow.advance`, `computeWagesBySection` settled-advance deduction, `sumOpenAdvances`, remove `sumPaidAdvances`.
**Actions:** `lib/actions/advances.ts` — add `settleAdvanceAction`, `reopenAdvanceAction`.
**Routes/UI moved:** `app/[locale]/(portal)/advances/*` → `app/[locale]/(portal)/wages/advances/*`.
**Wages views:** `wages/page.tsx`, `MyWagesView.tsx`, `WorkerSectionBreakdown.tsx`, `AdminSectionWageView.tsx`, `wages/projects/[projectId]/sections/[sectionId]/page.tsx`, `app/api/wages/projects/[projectId]/sections/route.ts`.
**Nav/i18n:** `lib/portal-nav.ts`, `messages/{en,sk,de,fr,sv}.json`.

---

## Task 1: Schema — SETTLED status, sectionId, settledAt

**Files:**
- Modify: `prisma/schema.prisma`
- Create (generated): `prisma/migrations/*_advance_settlement/migration.sql`

- [ ] **Step 1: Add `SETTLED` to the enum**

In `prisma/schema.prisma`, change the `AdvanceStatus` enum (currently REQUESTED/APPROVED/REJECTED/PAID) to add `SETTLED` as the last value:

```prisma
enum AdvanceStatus {
  REQUESTED
  APPROVED
  REJECTED
  PAID
  SETTLED
}
```

- [ ] **Step 2: Add fields + relation to `AdvanceRequest`**

In the `AdvanceRequest` model, add `sectionId`/`section`/`settledAt` (after `paidAt`) and the index (with the existing `@@index` lines):

```prisma
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
  sectionId   String?
  settledAt   DateTime?

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  section Section? @relation(fields: [sectionId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([status])
  @@index([sectionId])
}
```

- [ ] **Step 3: Add the reverse relation on `Section`**

In the `Section` model, add (alongside the existing `invoices`/`accommodations` relations):

```prisma
  advanceRequests AdvanceRequest[]
```

- [ ] **Step 4: Create and apply the migration**

Run: `npx prisma migrate dev --name advance_settlement`
Expected: a new migration is created and applied; `ALTER TYPE "AdvanceStatus" ADD VALUE 'SETTLED'`, `ALTER TABLE "AdvanceRequest" ADD COLUMN "sectionId"`, `ADD COLUMN "settledAt"`, the FK to `Section` (ON DELETE SET NULL), and `CREATE INDEX "AdvanceRequest_sectionId_idx"`. The migration does not USE the new enum value, so the PG "new enum value can't be used in same transaction" rule does not apply. Client regenerated. If it reports drift / wants to reset / prompts → STOP, report BLOCKED with output.

- [ ] **Step 5: Verify the client typechecks**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add SETTLED status, sectionId, settledAt to AdvanceRequest"
```

---

## Task 2: i18n — advance settlement keys (5 locales)

**Files:**
- Modify: `messages/en.json`, `messages/sk.json`, `messages/de.json`, `messages/fr.json`, `messages/sv.json`

- [ ] **Step 1: Add the new `advances` keys + `status.SETTLED`**

In each file, inside the existing `advances` object add these keys (and add `SETTLED` inside `advances.status`):

- en: `"settle": "Settle", "reopen": "Reopen", "section": "Section", "outstanding": "Open advances (outstanding)", "filterOpen": "Open", "filterSettled": "Settled", "filterAll": "All"` ; `status.SETTLED`: `"Settled"`
- sk: `"settle": "Strhnúť", "reopen": "Otvoriť späť", "section": "Sekcia", "outstanding": "Otvorené zálohy (nesplatené)", "filterOpen": "Otvorené", "filterSettled": "Uzavreté", "filterAll": "Všetky"` ; `status.SETTLED`: `"Uzavretá"`
- de: `"settle": "Verrechnen", "reopen": "Wieder öffnen", "section": "Abschnitt", "outstanding": "Offene Vorschüsse (ausstehend)", "filterOpen": "Offen", "filterSettled": "Verrechnet", "filterAll": "Alle"` ; `status.SETTLED`: `"Verrechnet"`
- fr: `"settle": "Déduire", "reopen": "Rouvrir", "section": "Section", "outstanding": "Avances ouvertes (en cours)", "filterOpen": "Ouvertes", "filterSettled": "Déduites", "filterAll": "Toutes"` ; `status.SETTLED`: `"Déduite"`
- sv: `"settle": "Avräkna", "reopen": "Öppna igen", "section": "Sektion", "outstanding": "Öppna förskott (utestående)", "filterOpen": "Öppna", "filterSettled": "Avräknade", "filterAll": "Alla"` ; `status.SETTLED`: `"Avräknad"`

- [ ] **Step 2: Add the `wages.advance` and `wages.openAdvances` keys**

In each file, inside the existing `wages` object add:

- en: `"advance": "Advance", "openAdvances": "Open advances (outstanding)"`
- sk: `"advance": "Záloha", "openAdvances": "Otvorené zálohy (nesplatené)"`
- de: `"advance": "Vorschuss", "openAdvances": "Offene Vorschüsse (ausstehend)"`
- fr: `"advance": "Avance", "openAdvances": "Avances ouvertes (en cours)"`
- sv: `"advance": "Förskott", "openAdvances": "Öppna förskott (utestående)"`

(Keep the existing `nav.advances` key — it is reused as the label for the `/wages → /wages/advances` link.)

- [ ] **Step 3: Verify JSON validity + key presence**

Run:
```
node -e "for(const l of ['en','sk','de','fr','sv']){const m=require('./messages/'+l+'.json'); if(!m.advances.settle||!m.advances.reopen||!m.advances.status.SETTLED||!m.wages.advance||!m.wages.openAdvances) throw new Error('missing '+l);} console.log('i18n ok')"
```
Expected: prints `i18n ok`.

- [ ] **Step 4: Commit**

```bash
git add messages
git commit -m "i18n: add advance settlement keys (settle/reopen/section/filters/SETTLED) + wages.advance"
```

---

## Task 3: Wage math — settled advance per section, open-advance sum

**Files:**
- Modify: `lib/portal/wages.ts`
- Test: `lib/portal/wages.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `lib/portal/wages.test.ts`:

```ts
const sectionAdvanceInput: WageInput & { sections: { id: string; name: string }[]; settledAdvances: { sectionId: string; amount: number }[] } = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  projectId: "p1",
  workers: [{ id: "w1", name: "Alice" }],
  sections: [{ id: "s1", name: "North" }, { id: "s2", name: "South" }, { id: "s3", name: "East" }],
  prices: [{ projectId: "p1", userId: "w1", priceTie: 1.0, priceConnect: 1.0 }],
  activity: [
    { userId: "w1", projectId: "p1", sectionId: "s1", action: "TIE", count: 100, workDate: new Date("2026-05-10") },
    { userId: "w1", projectId: "p1", sectionId: "s2", action: "TIE", count: 100, workDate: new Date("2026-05-10") },
  ],
  accommodations: [],
  settledAdvances: [
    { sectionId: "s1", amount: 30 },
    { sectionId: "s3", amount: 50 }, // s3 has no earnings — advance-only section
  ],
};

describe("computeWagesBySection settled advances", () => {
  it("deducts a settled advance in its section's net", () => {
    const rows = computeWagesBySection(sectionAdvanceInput);
    const s1 = rows.find((r) => r.sectionId === "s1")!;
    expect(s1.earnings).toBe(100);
    expect(s1.advance).toBe(30);
    expect(s1.wage).toBe(70); // 100 - 0 - 30
  });

  it("does not deduct another section's advance", () => {
    const rows = computeWagesBySection(sectionAdvanceInput);
    const s2 = rows.find((r) => r.sectionId === "s2")!;
    expect(s2.advance).toBe(0);
    expect(s2.wage).toBe(100);
  });

  it("includes an advance-only section (no earnings) with negative net", () => {
    const rows = computeWagesBySection(sectionAdvanceInput);
    const s3 = rows.find((r) => r.sectionId === "s3")!;
    expect(s3).toBeDefined();
    expect(s3.earnings).toBe(0);
    expect(s3.advance).toBe(50);
    expect(s3.wage).toBe(-50);
  });

  it("treats missing settledAdvances as zero", () => {
    const { settledAdvances: _omit, ...noAdv } = sectionAdvanceInput;
    const rows = computeWagesBySection(noAdv);
    const s1 = rows.find((r) => r.sectionId === "s1")!;
    expect(s1.advance).toBe(0);
    expect(s1.wage).toBe(100);
  });
});

describe("sumOpenAdvances", () => {
  const advs = [
    { amount: 100, status: "PAID" },
    { amount: 40, status: "APPROVED" },
    { amount: 25, status: "SETTLED" },
    { amount: 10, status: "REQUESTED" },
  ];
  it("sums only PAID (open) advances", () => {
    expect(sumOpenAdvances(advs)).toBe(100);
  });
  it("returns 0 for an empty list", () => {
    expect(sumOpenAdvances([])).toBe(0);
  });
});
```

Update the import at the top of `lib/portal/wages.test.ts` — remove `sumPaidAdvances`, add `sumOpenAdvances`:

```ts
import { computeWages, computeWagesByProject, computeWagesBySection, sumWageRows, sumOpenAdvances, type WageInput, type WageRow } from "./wages";
```

Also DELETE the existing `describe("sumPaidAdvances", ...)` block from the test file (it tests a function being removed).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/portal/wages.test.ts -t "settled advances|sumOpenAdvances"`
Expected: FAIL — `advance` is undefined on rows and `sumOpenAdvances` is not exported.

- [ ] **Step 3: Extend `SectionWageRow`**

In `lib/portal/wages.ts`, update the interface to add `advance`:

```ts
export interface SectionWageRow {
  sectionId: string;
  sectionName: string;
  tie: number;
  connect: number;
  earnings: number;
  accommodation: number;
  advance: number;
  wage: number;
}
```

- [ ] **Step 4: Add settled-advance deduction to `computeWagesBySection`**

In `lib/portal/wages.ts`, replace the whole `computeWagesBySection` function (keep its JSDoc, extend the first sentence to mention advances) with:

```ts
export function computeWagesBySection(
  input: WageInput & {
    sections: { id: string; name: string }[];
    settledAdvances?: { sectionId: string; amount: number }[];
  },
): SectionWageRow[] {
  const advanceBySection = new Map<string, number>();
  for (const a of input.settledAdvances ?? []) {
    advanceBySection.set(a.sectionId, (advanceBySection.get(a.sectionId) ?? 0) + a.amount);
  }

  const results: SectionWageRow[] = [];
  for (const section of input.sections) {
    const row = computeWages({ ...input, sectionId: section.id }).rows[0];
    const advance = advanceBySection.get(section.id) ?? 0;
    if (!row) continue;
    if (row.earnings === 0 && row.accommodation === 0 && advance === 0) continue;
    results.push({
      sectionId: section.id,
      sectionName: section.name,
      tie: row.breakdown.tie,
      connect: row.breakdown.connect,
      earnings: row.earnings,
      accommodation: row.accommodation,
      advance,
      wage: row.wage - advance,
    });
  }
  return results;
}
```

- [ ] **Step 5: Replace `sumPaidAdvances` with `sumOpenAdvances`**

In `lib/portal/wages.ts`, DELETE the entire `sumPaidAdvances` function (its JSDoc + body) and add in its place:

```ts
/**
 * Sums the amount of OPEN advances (status PAID — paid to the worker but not yet
 * settled against a section). This is the worker's outstanding advance balance.
 * Currency mixing is out of scope (amounts are summed as-is).
 */
export function sumOpenAdvances(advances: { amount: number; status: string }[]): number {
  let total = 0;
  for (const a of advances) {
    if (a.status === "PAID") total += a.amount;
  }
  return total;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run lib/portal/wages.test.ts`
Expected: PASS (the new tests pass; the pre-existing `computeWagesBySection` tests still pass because `advance` defaults to 0 and `wage` is unchanged; the old `sumPaidAdvances` block is gone).

- [ ] **Step 7: Commit**

```bash
git add lib/portal/wages.ts lib/portal/wages.test.ts
git commit -m "feat(wages): per-section settled-advance deduction; replace sumPaidAdvances with sumOpenAdvances"
```

---

## Task 4: Server actions — settle and reopen

**Files:**
- Modify: `lib/actions/advances.ts`

- [ ] **Step 1: Add the two actions**

Append to `lib/actions/advances.ts` (the file already imports `z`, `prisma`, `auth`, `requireAdmin`, `Currency`):

```ts
const settleSchema = z.object({
  id: z.string().min(1),
  sectionId: z.string().min(1),
});

/** Admin settles an open (PAID) advance against a section the worker is assigned to. */
export async function settleAdvanceAction(fd: FormData): Promise<AdvanceResult> {
  await requireAdmin();
  const parsed = settleSchema.safeParse({ id: fd.get("id"), sectionId: fd.get("sectionId") });
  if (!parsed.success) return { ok: false, error: "validation" };

  const adv = await prisma.advanceRequest.findUnique({ where: { id: parsed.data.id } });
  if (!adv) return { ok: false, error: "validation" };
  if (adv.status !== "PAID") return { ok: false, error: "bad-state" };

  const section = await prisma.section.findUnique({
    where: { id: parsed.data.sectionId },
    select: { projectId: true },
  });
  if (!section) return { ok: false, error: "validation" };

  const pw = await prisma.projectWorker.findUnique({
    where: { projectId_userId: { projectId: section.projectId, userId: adv.userId } },
    select: { id: true },
  });
  if (!pw) return { ok: false, error: "validation" };

  await prisma.advanceRequest.update({
    where: { id: parsed.data.id },
    data: { status: "SETTLED", sectionId: parsed.data.sectionId, settledAt: new Date() },
  });
  return { ok: true };
}

/** Admin reopens a SETTLED advance back to open (postpone / move to another section). */
export async function reopenAdvanceAction(fd: FormData): Promise<AdvanceResult> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, error: "validation" };

  const adv = await prisma.advanceRequest.findUnique({ where: { id } });
  if (!adv) return { ok: false, error: "validation" };
  if (adv.status !== "SETTLED") return { ok: false, error: "bad-state" };

  await prisma.advanceRequest.update({
    where: { id },
    data: { status: "PAID", sectionId: null, settledAt: null },
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
git commit -m "feat(portal): settleAdvanceAction and reopenAdvanceAction"
```

---

## Task 5: Move advances to /wages/advances; remove nav item; link from /wages

**Files:**
- Move: `app/[locale]/(portal)/advances/` → `app/[locale]/(portal)/wages/advances/`
- Modify: `lib/portal-nav.ts`
- Modify: `app/[locale]/(portal)/wages/page.tsx`

- [ ] **Step 1: Move the advances folder**

Run:
```bash
git mv "app/[locale]/(portal)/advances" "app/[locale]/(portal)/wages/advances"
```
Expected: `page.tsx`, `MyAdvancesView.tsx`, `AdminAdvancesView.tsx` now live under `wages/advances/`. (Their `@/`-imports are unaffected.)

- [ ] **Step 2: Remove the standalone nav item**

In `lib/portal-nav.ts`, remove `"advances"` from the `labelKey` union, and delete the two `{ href: "/advances", labelKey: "advances" }` lines (one in the ADMIN array, one in the WORKER array). Resulting file:

```ts
export type PortalNavItem = {
  href: string;
  labelKey:
    | "dashboard"
    | "projects"
    | "workers"
    | "accommodations"
    | "wages"
    | "applications"
    | "inquiries";
};

/**
 * Portal navigation destinations. `labelKey` is a key in the `nav`
 * next-intl namespace — each consumer resolves it with its own `t`.
 */
export function getPortalNavItems(role: "ADMIN" | "WORKER"): PortalNavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/dashboard", labelKey: "dashboard" },
      { href: "/projects", labelKey: "projects" },
      { href: "/workers", labelKey: "workers" },
      { href: "/accommodations", labelKey: "accommodations" },
      { href: "/wages", labelKey: "wages" },
      { href: "/applications", labelKey: "applications" },
      { href: "/inquiries", labelKey: "inquiries" },
    ];
  }
  return [
    { href: "/dashboard", labelKey: "dashboard" },
    { href: "/wages", labelKey: "wages" },
  ];
}
```

- [ ] **Step 3: Add a link from `/wages` to `/wages/advances` (both branches)**

In `app/[locale]/(portal)/wages/page.tsx`, add the imports at the top (after the existing imports):

```ts
import Link from "next/link";
```

In the **worker branch** return, replace the heading line `<h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>` with a header row (add `const tNav = await getTranslations("nav");` near the other `getTranslations` calls in that branch — there is already `const t = await getTranslations("wages");` at the top of the function, so add `tNav` once at function scope):

```tsx
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-navy">{t("title")}</h1>
        <Link href="/wages/advances" className="text-sm text-accent hover:underline">{tNav("advances")} →</Link>
      </div>
```

Do the same replacement in the **admin branch** return (its heading is `<h1 className="text-2xl font-semibold text-navy mb-8">{t("title")}</h1>`).

Add `const tNav = await getTranslations("nav");` once, near the existing `const t = await getTranslations("wages");` at the top of `WagesPage` (so both branches can use it).

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/portal-nav.ts "app/[locale]/(portal)/wages" "app/[locale]/(portal)/advances"
git commit -m "refactor(portal): move advances under /wages/advances and link from wages"
```

---

## Task 6: Section views — Advance column (API + worker breakdown + admin section)

**Files:**
- Modify: `app/api/wages/projects/[projectId]/sections/route.ts`
- Modify: `app/[locale]/(portal)/wages/MyWagesView.tsx`
- Modify: `app/[locale]/(portal)/wages/WorkerSectionBreakdown.tsx`
- Modify: `app/[locale]/(portal)/wages/projects/[projectId]/sections/[sectionId]/page.tsx`
- Modify: `app/[locale]/(portal)/wages/AdminSectionWageView.tsx`

- [ ] **Step 1: Section API loads settled advances and passes them through**

In `app/api/wages/projects/[projectId]/sections/route.ts`, add a query to the `withWorkerScope` `Promise.all` (after the `sectionInvoice` query) and capture it:

```ts
      tx.advanceRequest.findMany({
        where: { userId, status: "SETTLED", section: { projectId } },
        select: { sectionId: true, amount: true },
      }),
```

Update the destructure to include `settledAdvances`:

```ts
    const [prices, activity, sections, accommodations, invoices, settledAdvances] = await Promise.all([
```

and the returned object: `return { prices, activity, sections, accommodations, invoices, settledAdvances };`

Then pass them into `computeWagesBySection` (add this property to the existing call):

```ts
    settledAdvances: data.settledAdvances
      .filter((a) => a.sectionId)
      .map((a) => ({ sectionId: a.sectionId as string, amount: Number(a.amount) })),
```

(`WorkerSectionRow` already extends `SectionWageRow`, so the returned rows now include `advance` automatically.)

- [ ] **Step 2: Worker section breakdown shows the Advance column**

In `app/[locale]/(portal)/wages/WorkerSectionBreakdown.tsx`, change the empty-state `colSpan` from `6` to `7`, and add an Advance `<td>` between accommodation and wage:

Replace the empty-state row's `<td colSpan={6} ...>` with `<td colSpan={7} ...>`.

Replace the data row block with:

```tsx
        <tr key={s.sectionId} className="bg-bg/30">
          <td />
          <td className="px-4 py-2 pl-10 text-sm text-slate-ink">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.invoiced}
                onChange={() => onToggleInvoice(s.sectionId)}
                disabled={pendingSections.has(s.sectionId)}
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
          <td className="px-4 py-2 text-sm text-slate-ink">{s.advance.toFixed(2)}</td>
          <td className="px-4 py-2 text-sm text-slate-ink">{s.wage.toFixed(2)}</td>
        </tr>
```

- [ ] **Step 3: MyWagesView table gets the Advance column header + project-row placeholder**

In `app/[locale]/(portal)/wages/MyWagesView.tsx`, add an Advance header between accommodation and wage in the `<thead>`:

```tsx
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("accommodation")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("advance")}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">{t("wage")}</th>
```

In the project header row, add a placeholder Advance cell between the accommodation and wage cells (advances are settled per section, not at project level):

```tsx
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.accommodation.toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted align-middle">—</td>
                    <td className="px-4 py-3 text-slate-ink align-middle">{p.wage.toFixed(2)}</td>
```

Change the section-error row `colSpan` from `6` to `7`:

```tsx
                      <td colSpan={7} className="px-4 py-2 pl-10 text-sm text-red-600 italic">
```

- [ ] **Step 4: Admin section page loads settled advances per worker**

In `app/[locale]/(portal)/wages/projects/[projectId]/sections/[sectionId]/page.tsx`, add a query to the `Promise.all` (after the `sectionInvoice` query) and capture it:

```ts
    prisma.advanceRequest.findMany({ where: { sectionId, status: "SETTLED" }, select: { userId: true, amount: true } }),
```

Update the destructure: `const [section, project, workers, prices, activity, accommodations, invoices, settledAdvances] = await Promise.all([`

Build a per-user advance map (after `invoicedByUser`):

```ts
  const advanceByUser = new Map<string, number>();
  for (const a of settledAdvances) {
    advanceByUser.set(a.userId, (advanceByUser.get(a.userId) ?? 0) + Number(a.amount));
  }
```

Extend `workerRows` to add `advance` and widen the filter to keep advance-only rows:

```ts
  const workerRows = result.rows
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      tie: r.breakdown.tie,
      connect: r.breakdown.connect,
      earnings: r.earnings,
      accommodation: r.accommodation,
      advance: advanceByUser.get(r.userId) ?? 0,
      invoicedAt: invoicedByUser.get(r.userId) ?? null,
      warnings: r.warnings,
    }))
    .filter((r) => r.earnings !== 0 || r.accommodation !== 0 || r.advance !== 0);
```

- [ ] **Step 5: AdminSectionWageView gets the Advance column**

In `app/[locale]/(portal)/wages/AdminSectionWageView.tsx`, add `advance: number` to the `SectionWorkerRow` type (after `accommodation`), add the header, and the cell:

Type:
```ts
type SectionWorkerRow = {
  userId: string;
  name: string;
  tie: number;
  connect: number;
  earnings: number;
  accommodation: number;
  advance: number;
  invoicedAt: string | null;
  warnings: string[];
};
```

Headers (add `t("advance")` between accommodation and invoiced):
```tsx
        headers={[tCommon("name"), t("tie"), t("connect"), t("earnings"), t("accommodation"), t("advance"), t("invoiced")]}
```

Row cells (add the advance `NumCell` between accommodation and the invoiced span):
```tsx
          <NumCell key={`acc-${w.userId}`} value={w.accommodation} />,
          <NumCell key={`adv-${w.userId}`} value={w.advance} />,
          <span key={`inv-${w.userId}`} className="text-sm text-slate-ink">{w.invoicedAt ? `✓ ${w.invoicedAt.slice(0, 10)}` : "—"}</span>,
```

- [ ] **Step 6: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "app/api/wages/projects/[projectId]/sections/route.ts" "app/[locale]/(portal)/wages/MyWagesView.tsx" "app/[locale]/(portal)/wages/WorkerSectionBreakdown.tsx" "app/[locale]/(portal)/wages/projects/[projectId]/sections/[sectionId]/page.tsx" "app/[locale]/(portal)/wages/AdminSectionWageView.tsx"
git commit -m "feat(wages): show settled-advance deduction column in section views"
```

---

## Task 7: Worker wages totals — open advances outstanding

**Files:**
- Modify: `app/[locale]/(portal)/wages/page.tsx`
- Modify: `app/[locale]/(portal)/wages/MyWagesView.tsx`

- [ ] **Step 1: Compute open-advances outstanding in the worker branch**

In `app/[locale]/(portal)/wages/page.tsx`:

Change the import from `@/lib/portal/wages` to swap `sumPaidAdvances` → `sumOpenAdvances` (it currently imports `sumPaidAdvances`).

In the worker branch, remove the `toEndOfDay` block (the two/three lines computing `toEndOfDay`). Change the `advanceRequest` query in the `Promise.all` to load the worker's open (PAID) advances regardless of date:

```ts
        tx.advanceRequest.findMany({ where: { status: "PAID" }, select: { amount: true, status: true } }),
```

Replace the `advancesTotal = sumPaidAdvances(...)` computation with:

```ts
    const openAdvances = sumOpenAdvances(
      data.advances.map((a) => ({ amount: Number(a.amount), status: a.status })),
    );
```

Update the `<MyWagesView ... advances={advancesTotal} />` prop to `openAdvances={openAdvances}`.

- [ ] **Step 2: MyWagesView shows a single Open-advances total cell**

In `app/[locale]/(portal)/wages/MyWagesView.tsx`:

Rename the prop `advances` → `openAdvances` in the component signature and type:

```tsx
export function MyWagesView({
  from,
  to,
  result,
  openAdvances,
}: {
  from: string;
  to: string;
  result: WageByProjectResult;
  openAdvances: number;
}) {
```

Update `hasTotal`:

```tsx
  const hasTotal = result.total.earnings !== 0 || result.total.accommodation !== 0 || openAdvances !== 0;
```

In the totals `<dl>`, change `sm:grid-cols-7` to `sm:grid-cols-6`, and replace the two cells (the `advances` cell and the `netToPay` cell) with a single Open-advances cell (keep tie/connect/earnings/accommodation/wage cells unchanged):

```tsx
          <dl className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-sm">
            ... (tie, connect, earnings, accommodation, wage cells unchanged) ...
            <div>
              <dt className="text-xs text-muted">{t("openAdvances")}</dt>
              <dd className="font-semibold text-navy">{openAdvances.toFixed(2)}</dd>
            </div>
          </dl>
```

(Delete the old `{t("advances")}` and `{t("netToPay")}` cells.)

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(portal)/wages/page.tsx" "app/[locale]/(portal)/wages/MyWagesView.tsx"
git commit -m "feat(wages): show open-advances outstanding total; drop range-based advance deduction"
```

---

## Task 8: Advances UI — filter, settle/reopen, section display

**Files:**
- Modify: `app/[locale]/(portal)/wages/advances/page.tsx`
- Modify: `app/[locale]/(portal)/wages/advances/AdminAdvancesView.tsx`
- Modify: `app/[locale]/(portal)/wages/advances/MyAdvancesView.tsx`

- [ ] **Step 1: Page loads section name (worker) + candidate sections (admin)**

Replace `app/[locale]/(portal)/wages/advances/page.tsx` with:

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
      tx.advanceRequest.findMany({
        orderBy: { requestedAt: "desc" },
        include: { section: { select: { name: true } } },
      }),
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
            sectionName: r.section?.name ?? null,
          }))}
        />
      </div>
    );
  }

  const [rows, allSections, projectWorkers] = await Promise.all([
    prisma.advanceRequest.findMany({
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      include: { user: true, section: { select: { name: true } } },
    }),
    prisma.section.findMany({ select: { id: true, name: true, projectId: true }, orderBy: { orderIndex: "asc" } }),
    prisma.projectWorker.findMany({ select: { userId: true, projectId: true } }),
  ]);

  const projectsByUser = new Map<string, Set<string>>();
  for (const pw of projectWorkers) {
    const set = projectsByUser.get(pw.userId) ?? new Set<string>();
    set.add(pw.projectId);
    projectsByUser.set(pw.userId, set);
  }

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
          sectionName: r.section?.name ?? null,
          settledAt: r.settledAt ? r.settledAt.toLocaleDateString() : null,
          candidateSections: allSections.filter((s) => projectsByUser.get(r.userId)?.has(s.projectId)).map((s) => ({ id: s.id, name: s.name })),
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 2: Worker view shows status incl. SETTLED + settled section**

Replace `app/[locale]/(portal)/wages/advances/MyAdvancesView.tsx`'s `Row` type and the status cell so settled rows show their section. Update the `Row` type:

```tsx
type Row = {
  id: string;
  amount: string;
  currency: string;
  note: string | null;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PAID" | "SETTLED";
  requestedAt: string;
  sectionName: string | null;
};
```

Add a `t("section")` column. Change the list `DataTable` headers and rows:

```tsx
        <DataTable
          headers={[t("amount"), tCommon("currency"), tCommon("status"), t("section"), t("requestedAt"), t("note"), tCommon("actions")]}
          empty={t("noRequests")}
          rows={requests.map((r) => [
            r.amount,
            r.currency,
            t(`status.${r.status}`),
            r.sectionName ?? "—",
            r.requestedAt,
            r.note ?? "—",
            r.status === "REQUESTED" ? (
              <button onClick={() => onCancel(r.id)} disabled={pending} className="text-red-600 underline">
                {t("cancel")}
              </button>
            ) : "—",
          ])}
        />
```

- [ ] **Step 3: Admin view — filter + settle (section picker) + reopen**

Replace `app/[locale]/(portal)/wages/advances/AdminAdvancesView.tsx` with:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/portal/DataTable";
import {
  decideAdvanceAction,
  markAdvancePaidAction,
  settleAdvanceAction,
  reopenAdvanceAction,
} from "@/lib/actions/advances";

type Status = "REQUESTED" | "APPROVED" | "REJECTED" | "PAID" | "SETTLED";

type Row = {
  id: string;
  workerName: string;
  amount: string;
  currency: string;
  note: string | null;
  status: Status;
  requestedAt: string;
  sectionName: string | null;
  settledAt: string | null;
  candidateSections: { id: string; name: string }[];
};

type Filter = "open" | "settled" | "all";

export function AdminAdvancesView({ requests }: { requests: Row[] }) {
  const t = useTranslations("advances");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");

  function run(action: (fd: FormData) => Promise<{ ok: boolean }>, fields: Record<string, string>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    setError(null);
    start(async () => {
      const r = await action(fd);
      if (r.ok) router.refresh();
      else setError(tCommon("saveError"));
    });
  }

  const shown = requests.filter((r) =>
    filter === "all" ? true : filter === "open" ? r.status === "PAID" : r.status === "SETTLED",
  );

  function actionsFor(r: Row) {
    if (r.status === "REQUESTED") {
      return (
        <span className="flex gap-3">
          <button onClick={() => run(decideAdvanceAction, { id: r.id, decision: "approve" })} disabled={pending} className="text-navy underline">{t("approve")}</button>
          <button onClick={() => run(decideAdvanceAction, { id: r.id, decision: "reject" })} disabled={pending} className="text-red-600 underline">{t("reject")}</button>
        </span>
      );
    }
    if (r.status === "APPROVED") {
      return <button onClick={() => run(markAdvancePaidAction, { id: r.id })} disabled={pending} className="text-navy underline">{t("markPaid")}</button>;
    }
    if (r.status === "PAID") {
      return <SettleControl row={r} disabled={pending} onSettle={(sectionId) => run(settleAdvanceAction, { id: r.id, sectionId })} t={t} />;
    }
    if (r.status === "SETTLED") {
      return <button onClick={() => run(reopenAdvanceAction, { id: r.id })} disabled={pending} className="text-navy underline">{t("reopen")}</button>;
    }
    return <span className="text-muted">—</span>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["open", "settled", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md border ${filter === f ? "bg-navy text-white border-navy" : "border-border-soft text-slate-ink hover:bg-bg"}`}
          >
            {t(f === "open" ? "filterOpen" : f === "settled" ? "filterSettled" : "filterAll")}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}

      <DataTable
        headers={[t("worker"), t("amount"), tCommon("currency"), tCommon("status"), t("section"), t("requestedAt"), t("note"), tCommon("actions")]}
        empty={t("noRequests")}
        rows={shown.map((r) => [
          r.workerName,
          r.amount,
          r.currency,
          t(`status.${r.status}`),
          r.sectionName ?? "—",
          r.requestedAt,
          r.note ?? "—",
          actionsFor(r),
        ])}
      />
    </div>
  );
}

function SettleControl({
  row,
  disabled,
  onSettle,
  t,
}: {
  row: Row;
  disabled: boolean;
  onSettle: (sectionId: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [sectionId, setSectionId] = useState("");
  return (
    <span className="flex items-center gap-2">
      <select
        value={sectionId}
        onChange={(e) => setSectionId(e.target.value)}
        className="rounded-md border border-border-soft bg-surface px-2 py-1 text-sm"
      >
        <option value="">{t("section")}…</option>
        {row.candidateSections.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button
        onClick={() => onSettle(sectionId)}
        disabled={disabled || !sectionId}
        className="text-navy underline disabled:no-underline disabled:text-muted"
      >
        {t("settle")}
      </button>
    </span>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(portal)/wages/advances"
git commit -m "feat(advances): open/settled filter, settle against section, reopen"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Tests**

Run: `npm test`
Expected: all vitest tests pass (the wages suite including the new settled-advance and `sumOpenAdvances` tests).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors (the pre-existing `CoverageArea.tsx` img warning is acceptable).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds; `/[locale]/wages/advances` compiles and the old `/[locale]/advances` route is gone.

- [ ] **Step 5: Manual smoke test (dev server)**

Run `npm run dev`, then with seeded data verify:
- Worker → Wages → "Advances →" link opens `/wages/advances`; request an advance; it shows as REQUESTED.
- Admin → Wages → Advances: Approve → Mark paid → row becomes Open (PAID). With filter "Open" it shows; pick a section and Settle → it moves to Settled with the section name + settled date. Reopen returns it to Open.
- Admin → Wages → project → section: the settled advance shows in the Advance column for that worker.
- Worker → Wages: the section's net reflects `earnings − accommodation − advance`; the totals show "Open advances (outstanding)".

- [ ] **Step 6: Final commit (if any cleanup)**

```bash
git add -A
git commit -m "chore: advances section-settlement — verification pass"
```

---

## Self-Review

**Spec coverage:**
- Module under Wages (`/wages/advances`), nav item removed, link from /wages → Task 5. ✅
- Section tied at settlement by admin; whole advance, one section → Tasks 1, 4, 8. ✅
- Open vs settled (status PAID vs SETTLED), postpone/reopen → Tasks 1, 4, 8. ✅
- Settled advance deducted from that section's line (worker + admin views) → Tasks 3, 6. ✅
- Open advances shown as outstanding; range-based deduction removed → Tasks 3, 7. ✅
- RLS: no policy change needed (existing `AdvanceRequest` SELECT policy + `Section` policy cover it) — no task required; noted in spec. ✅
- i18n 5 locales → Task 2. ✅
- Tests for new wage math → Task 3. ✅

**Type consistency:** `SectionWageRow.advance` (Task 3) flows to `WorkerSectionRow` (unchanged `section-row.ts`) and is rendered in Task 6. `settledAdvances: { sectionId; amount }[]` param name is consistent between `computeWagesBySection` (Task 3), the section API (Task 6 Step 1). `sumOpenAdvances({ amount; status })` (Task 3) matches the page mapping (Task 7). `settleAdvanceAction({ id, sectionId })` / `reopenAdvanceAction({ id })` (Task 4) match the AdminAdvancesView calls (Task 8). The admin `Row.candidateSections`/`sectionName`/`settledAt` (Task 8 page mapping) match the view type.

**Placeholder scan:** none — every step has concrete code/commands.

**Notes for the implementer:**
- Tasks are ordered so schema (1) and logic (3) precede the views that depend on them. i18n (2) is early so manual checks render correctly.
- `prisma migrate dev` needs the dev DB; never reset. The enum `ADD VALUE` is safe here because the migration does not use `SETTLED`.
- This branch already contains the base advances feature; these tasks refine it (some replace earlier code — e.g. `sumPaidAdvances` is removed).
