# Worker portal: per-section payroll, invoicing, advances, section-attributed accommodation

**Date:** 2026-06-01
**Status:** Approved (design) — pending implementation plan

## Goal

Extend the worker-facing portal so that, in the wages view, workers see their pay broken
down by **section** and can act on each section. Concretely:

1. **Wages by section** — the worker sees per-section earnings, the accommodation deducted
   from that section, and the section net.
2. **Mark section invoiced** — the worker can tick that they have invoiced a given section
   (their own earnings for that section); they can untick it again.
3. **Request an advance** — the worker can request an advance payment; the admin approves /
   rejects / marks it paid; a paid advance is deducted from the worker's net wage.
4. **Attach accommodation to a section** — the admin can assign an accommodation to a
   specific section so its cost is deducted from that section's wage line (instead of the
   current project-level, date-overlap split).

## Actors

| Action | Performed by |
|---|---|
| View wages by section | Worker (own data) |
| Tick / untick "invoiced" on a section | Worker |
| Create / cancel advance request | Worker |
| Approve / reject / mark-paid advance | Admin |
| Assign accommodation to a section | Admin |

"Section" = the existing `Section` model (a subdivision of a `Project`, containing `Table`s).
Invoiced status and section earnings are **per (worker, section)** — a worker invoices their
own earnings for that section.

## Architecture (follows existing conventions)

- **Writes** go through server actions (`"use server"`) using `auth()` + zod validation and the
  owner `prisma` client, mirroring `lib/actions/activity.ts`. The owner client bypasses RLS;
  each action re-checks ownership/role itself. Admin actions use `requireAdmin()`.
- **Worker reads** go through the RLS-enforced `withWorkerScope(userId, tx => …)` connection
  (`lib/prisma-worker.ts`), exactly as the current worker wages page does.
- **Wage math** stays centralized in `lib/portal/wages.ts`.
- **i18n** via next-intl across all five locales (`en`, `sk`, `de`, `fr`, `sv`).
- **Admin list/detail** screens follow the `applications` / `inquiries` pattern.

## Data model (`prisma/schema.prisma`)

Two new models, one new enum, one new optional field on `Accommodation`, plus reverse relations.

```prisma
enum AdvanceStatus {
  REQUESTED
  APPROVED
  REJECTED
  PAID
}

// A worker marking their own earnings for one section as invoiced.
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

// A general advance the worker requests against future earnings.
model AdvanceRequest {
  id          String        @id @default(cuid())
  userId      String
  amount      Decimal       @db.Decimal(10, 2)
  currency    Currency      @default(EUR)
  note        String?
  status      AdvanceStatus @default(REQUESTED)
  requestedAt DateTime      @default(now())
  decidedAt   DateTime?     // set on APPROVED / REJECTED
  paidAt      DateTime?     // set on PAID

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
}
```

Additions to existing models:

```prisma
model Accommodation {
  // ...existing fields...
  sectionId String?
  section   Section? @relation(fields: [sectionId], references: [id], onDelete: SetNull)

  @@index([sectionId])   // in addition to existing indexes
}

model Section {
  // ...existing fields...
  invoices       SectionInvoice[]
  accommodations Accommodation[]
}

model ProjectWorker {
  // ...existing fields...
  sectionInvoices SectionInvoice[]
}

model User {
  // ...existing fields...
  advanceRequests AdvanceRequest[]
}
```

Invariant: when `Accommodation.sectionId` is set, `Accommodation.projectId` must equal that
section's `projectId` (enforced in the save action, not the DB).

## Wage math changes (`lib/portal/wages.ts`)

### Accommodation: section attribution

Add `sectionId?: string | null` to the accommodation entries in `WageInput`:

```ts
accommodations: {
  id: string;
  totalCost: number;
  currency: Currency;
  startDate: Date;
  endDate: Date;
  workerIds: string[];
  projectId: string | null;
  sectionId?: string | null;   // NEW
}[];
```

In `computeWages`, the accommodation filter gains one line so a section query only counts the
accommodations attached to that section:

```ts
const overlappingAccommodations = input.accommodations.filter((acc) => {
  if (projectFilter && acc.projectId !== projectFilter) return false;
  if (sectionFilter && acc.sectionId !== sectionFilter) return false;   // NEW
  return overlaps(range, { start: acc.startDate, end: acc.endDate });
});
```

Behaviour that falls out of this single change:

- **Section view** (`sectionFilter` set): only accommodations with `sectionId === sectionFilter`
  are deducted, split equally across that accommodation's `workerIds`, gated by date overlap.
- **Project view** (`sectionFilter` null): all of the project's overlapping accommodations are
  counted once — both section-assigned and unassigned. The per-project total is unchanged.
- **No double counting:** within a single computed view each accommodation is counted at most
  once (project view counts it once for the project; section view attributes it to exactly one
  section). Unassigned accommodations do not appear in any section row — they remain a
  project-level deduction visible in the project row / totals.

### `computeWagesBySection` now includes accommodation

`SectionWageRow` gains accommodation and net:

```ts
export interface SectionWageRow {
  sectionId: string;
  sectionName: string;
  tie: number;
  connect: number;
  earnings: number;
  accommodation: number;   // NEW
  wage: number;            // NEW: earnings - accommodation
}
```

`computeWagesBySection` passes the real accommodations through (instead of `accommodations: []`)
and lets `computeWages` filter them by `sectionId`. A section is included if it has earnings
**or** an accommodation deduction:

```ts
if (!row || (row.earnings === 0 && row.accommodation === 0)) continue;
```

### Advances: deducted from net at the page level

Advances are **general** (per worker, not tied to a project/section), so they are not part of
`computeWages`. They are summed at the page level and shown as a separate total line.

Add a small pure helper to `wages.ts`:

```ts
/** Sums PAID advances whose paidAt falls within [from, to]. */
export function sumPaidAdvances(
  advances: { amount: number; currency: Currency; status: string; paidAt: Date | null }[],
  from: Date,
  to: Date,
): number;
```

Net to pay (worker view total) = `total earnings − total accommodation − paid advances in range`.
The advance deduction uses `paidAt` for range membership, consistent with how earnings
(`workDate`) and accommodation (date overlap) already respect the selected range.

## API change (`app/api/wages/projects/[projectId]/sections/route.ts`)

- Load the project's accommodations (RLS-scoped, with their `workers`) and pass them to
  `computeWagesBySection` so section rows carry their accommodation/net.
- Load this worker's `SectionInvoice` rows for the project and merge an `invoiced` flag onto
  each returned section.

Response shape becomes:

```ts
{ sections: (SectionWageRow & { invoiced: boolean; invoicedAt: string | null })[] }
```

## UI / UX

### Worker wages view (`MyWagesView`, `WorkerSectionBreakdown`)

- The expandable per-section rows show: section name, tie, connect, earnings,
  **accommodation (section)**, **net (section)**, and an **"Invoiced" checkbox** with the
  invoiced date when set.
- Ticking the checkbox calls `toggleSectionInvoiceAction` and updates the cached section state
  optimistically (the breakdown is client-fetched, so no server revalidation is required for it).
- The totals block gains an **Advances** figure and a **Net to pay** figure:
  `earnings − accommodation − advances = net to pay`.

### Advances (new route `app/[locale]/(portal)/advances`)

New nav item **"Advances"** for both roles (`lib/portal-nav.ts`), role-aware page:

- **Worker:** a list of their own requests (amount, currency, status badge, requested/decided/
  paid dates) and a "Request advance" form (amount, currency, optional note). A request in
  `REQUESTED` state has a "Cancel" action.
- **Admin:** a list of all requests (worker name, amount, currency, status, dates) with
  **Approve**, **Reject**, and **Mark paid** actions. Modelled on `applications` / `inquiries`
  (list, with row/detail actions).

### Accommodation form (`AccommodationForm` + `new` / `[id]` pages)

- Add a **Section** `<select>` (optional, "— none —"). Its options are the sections of the
  currently selected project; the form receives all sections as `{ id, name, projectId }[]` and
  filters client-side by the chosen `projectId`. Changing the project resets the section.
- `new/page.tsx` and `[id]/page.tsx` load `prisma.section.findMany` (id, name, projectId,
  ordered) and pass them in; `[id]` preselects `acc.sectionId`.

### Admin section wage view (`AdminSectionWageView` + section page)

- Add an **Accommodation** column (now that accommodation can be section-attributed) and an
  **Invoiced** indicator per worker (who invoiced and when) — the visibility the admin asked for.
- The section page loads that section's accommodations and the section's `SectionInvoice` rows
  and feeds them to the view.

## Server actions

### `lib/actions/section-invoice.ts` (worker)

```
toggleSectionInvoiceAction(fd: { sectionId })
  - auth(); resolve section -> projectId
  - find ProjectWorker(projectId, userId); if none -> { ok:false, error:"not-assigned" }
  - if SectionInvoice(sectionId, projectWorkerId) exists -> delete, else create
  - return { ok:true, invoiced: boolean, invoicedAt: string|null }
```

### `lib/actions/advances.ts`

```
requestAdvanceAction(fd: { amount, currency, note? })   // worker
  - auth(); zod: amount > 0, currency in {USD,EUR}
  - create AdvanceRequest(userId=session.user.id, status=REQUESTED)

cancelAdvanceAction(fd: { id })                          // worker
  - auth(); load request; require ownership AND status === REQUESTED
  - delete

decideAdvanceAction(fd: { id, decision: "approve"|"reject" })   // admin
  - requireAdmin(); require current status === REQUESTED
  - set status APPROVED|REJECTED, decidedAt = now

markAdvancePaidAction(fd: { id })                        // admin
  - requireAdmin(); require current status === APPROVED
  - set status PAID, paidAt = now
```

All revalidate `/advances` (and the locale-prefixed path, per the recent
`fix(portal): revalidate locale-prefixed path` convention) and `/wages` where relevant.

### `lib/actions/accommodations.ts` (admin, extend existing)

- Add `sectionId: z.string().optional().nullable()` to the schema.
- If `sectionId` is set, verify the section exists and `section.projectId === projectId`;
  otherwise reject with `"validation"`. Persist `sectionId` (null when empty).

## RLS (new migration + role grants)

New migration `*_rls_section_invoice_advance/migration.sql`:

```sql
ALTER TABLE "SectionInvoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_section_invoice ON "SectionInvoice"
  FOR SELECT
  USING ("projectWorkerId" IN (SELECT id FROM "ProjectWorker"));

ALTER TABLE "AdvanceRequest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_advance_request ON "AdvanceRequest"
  FOR SELECT
  USING ("userId" = current_setting('app.user_id', true));

GRANT SELECT ON "SectionInvoice", "AdvanceRequest" TO qs_worker;
```

Also add `"SectionInvoice"` and `"AdvanceRequest"` to the `GRANT SELECT` list in
`scripts/setup-rls-role.sql` so fresh environments grant them too. RLS is ENABLEd (not FORCEd),
so the owner connection used by server actions continues to write freely; `qs_worker` gets
SELECT-only and is fully constrained by the policies above. The new `Accommodation.sectionId`
needs no policy change — accommodation visibility is still gated by `AccommodationWorker`
membership.

## i18n (`messages/{en,sk,de,fr,sv}.json`)

- `nav.advances`
- New `advances` namespace: `title`, `request`, `amount`, `note`, `statusRequested`,
  `statusApproved`, `statusRejected`, `statusPaid`, `approve`, `reject`, `markPaid`, `cancel`,
  `requestedAt`, `decidedAt`, `paidAt`, `noRequests`, `mine`, `allRequests`, `confirmCancel`.
- `wages.invoiced`, `wages.invoicedAt`, `wages.advances`, `wages.netToPay`.

(Reuse existing `common.*` and `wages.accommodation` where they fit.)

## Testing (`vitest`)

Extend `lib/portal/wages.test.ts`:

- Accommodation with `sectionId` is deducted in that section's row and not in sibling sections.
- An unassigned accommodation does not appear in any section row but is still counted in the
  per-project total (no double counting between the two views).
- `computeWagesBySection` includes a section that has only an accommodation deduction (zero
  earnings) and computes `wage = earnings − accommodation`.
- `sumPaidAdvances` counts only `PAID` advances whose `paidAt` is within range; ignores
  `REQUESTED` / `APPROVED` / `REJECTED` and out-of-range paid advances.

## Files

**Create**
- `prisma/migrations/*_add_section_invoice_advance/` (Prisma-generated schema migration)
- `prisma/migrations/*_rls_section_invoice_advance/migration.sql` (hand-written RLS + grants)
- `lib/actions/section-invoice.ts`
- `lib/actions/advances.ts`
- `app/[locale]/(portal)/advances/page.tsx` (role-aware)
- `app/[locale]/(portal)/advances/*` components (request form, list, admin actions)

**Modify**
- `prisma/schema.prisma`
- `lib/portal/wages.ts`
- `app/api/wages/projects/[projectId]/sections/route.ts`
- `app/[locale]/(portal)/wages/page.tsx` (worker branch loads advances)
- `app/[locale]/(portal)/wages/MyWagesView.tsx`
- `app/[locale]/(portal)/wages/WorkerSectionBreakdown.tsx`
- `app/[locale]/(portal)/wages/AdminSectionWageView.tsx` and the section page
- `app/[locale]/(portal)/accommodations/AccommodationForm.tsx` + `new`/`[id]` pages
- `lib/actions/accommodations.ts`
- `lib/portal-nav.ts`
- `scripts/setup-rls-role.sql`
- `messages/{en,sk,de,fr,sv}.json`

## Out of scope (YAGNI)

- Invoice numbers / amounts / attachments on the invoiced flag (just a toggle + timestamp).
- Tying advances to a specific project or section, or partial-repayment scheduling.
- Notifications/emails on advance status changes.
- Multi-currency netting between EUR/USD (existing mixed-currency warning behaviour is reused).
