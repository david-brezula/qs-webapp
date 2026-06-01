# Advances as a section-settled module within Wages

**Date:** 2026-06-01
**Status:** Approved (design) — pending implementation plan
**Builds on:** `2026-06-01-portal-section-payroll-design.md` (refines the advances capability)

## Goal

Rework the advances feature so that:

1. It lives as a **sub-page within the Wages module** (`/wages/advances`); the standalone
   top-level "Advances" nav item is removed.
2. Each advance is **tied to the section it is deducted from**, assigned by the admin **at
   settlement time** (not at request time).
3. The admin can see **which advances are still open** (paid but not yet deducted) **vs
   settled** (already deducted from a section), and can postpone an open advance to a later
   section.
4. A **settled** advance is deducted from **that section's** wage line; an **open** advance is
   outstanding and deducts from nothing yet.

This refines the advances capability shipped on this branch (general per-worker advances
deducted from net by paid-date). That general deduction is **replaced** by the per-section
settlement model below.

## Vocabulary / lifecycle

```
REQUESTED ─approve→ APPROVED ─mark paid→ PAID(open) ─settle(section)→ SETTLED(closed)
    └────reject→ REJECTED (terminal)                      ▲                 │
                                                          └──── reopen ─────┘
```

- **Open** = `status = PAID`, `sectionId = null`. Paid to the worker, owed back, not yet
  deducted from any section.
- **Settled** = `status = SETTLED`, `sectionId` set, `settledAt` set. Deducted from that
  section's wage line.
- **Postpone** = leave an advance open (do not settle it against the current section); settle
  against a later section when ready. **Reopen** = move an already-settled advance back to open
  (correction / move to a different section later).
- One whole advance settles against exactly one section (no partial/split settlement).

## Data model (`prisma/schema.prisma`)

```prisma
enum AdvanceStatus {
  REQUESTED
  APPROVED
  REJECTED
  PAID        // = "open" (paid, not yet settled against a section)
  SETTLED     // deducted from `section`
}

model AdvanceRequest {
  // ...existing fields (id, userId, amount, currency, note, status,
  //    requestedAt, decidedAt, paidAt)...
  sectionId String?
  section   Section?  @relation(fields: [sectionId], references: [id], onDelete: SetNull)
  settledAt DateTime?

  @@index([sectionId])   // in addition to existing @@index([userId]) and @@index([status])
}

model Section {
  // ...existing fields...
  advanceRequests AdvanceRequest[]
}
```

Invariant (enforced in the settle action, not the DB): when `sectionId` is set, the section
must belong to a project the advance's worker is assigned to (`ProjectWorker(projectId, userId)`
exists).

## Wage math (`lib/portal/wages.ts`)

Settled advances are a **section-level** deduction (they are tied to a section, not a date), so
they are handled in `computeWagesBySection` and the section views — **not** in the date-ranged
project/overall totals.

- `SectionWageRow` gains `advance: number`; `wage` becomes `earnings − accommodation − advance`.
- `computeWagesBySection` gains an input `advances: { userId: string; sectionId: string; amount: number }[]`
  (SETTLED advances only). For each section, `advance = Σ amount` of advances where
  `sectionId === section.id` (the input is for the single worker being viewed). A section is
  included when `earnings !== 0 || accommodation !== 0 || advance !== 0`.
- `computeWages` and `computeWagesByProject` are **not** changed for advances — advances are not
  deducted from the date-ranged project/overall totals.

**Removed:** the page-level general deduction added earlier on this branch —
`sumPaidAdvances(...)` usage in `wages/page.tsx`, the `advances`/`netToPay` total cells in
`MyWagesView`, and the end-of-day boundary handling for advances. `sumPaidAdvances` is replaced
by a simple **open-advances outstanding** figure (sum of the worker's `PAID` advances), shown as
an informational line. Keep `sumPaidAdvances` only if still used; otherwise delete it and its
tests. (Decision: delete it — nothing else uses it.)

## API / pages data flow

- **Worker section API** (`app/api/wages/projects/[projectId]/sections/route.ts`): additionally
  load the worker's `SETTLED` advances for this project's sections
  (`where: { userId, status: "SETTLED", section: { projectId } }`), pass them to
  `computeWagesBySection`, and the returned `WorkerSectionRow` carries `advance` (via the
  extended `SectionWageRow`). No new field beyond `advance` is needed on `WorkerSectionRow`.
- **Worker wages page** (`wages/page.tsx`, worker branch): remove the `sumPaidAdvances`
  deduction; compute `openAdvances` = sum of the worker's `PAID` advances (RLS-scoped) and pass
  it to `MyWagesView` as an outstanding figure.
- **Admin section page** (`wages/projects/[projectId]/sections/[sectionId]/page.tsx`): load the
  section's `SETTLED` advances (`where: { sectionId, status: "SETTLED" }`), pass them to
  `computeWagesBySection`/`computeWages` per worker, and surface `advance` per worker row.

## UI

### Wages module navigation

- Remove the standalone `/advances` nav item from `lib/portal-nav.ts` (both roles).
- Add a link/tab from the Wages pages to `/wages/advances` (visible to both roles). A small
  header link on `/wages` ("Advances →") is sufficient — no new nav abstraction.

### `/wages/advances` (moved from `/advances`)

- **Worker:** request form (amount, currency, note) + own advances list. Each row shows status;
  for `SETTLED` rows show the section name. Cancel only while `REQUESTED`.
- **Admin:** all advances list with a **filter: Open / Settled / All**. Per-row actions by
  status: Approve/Reject (REQUESTED), Mark paid (APPROVED), **Settle** (PAID) → a section picker
  listing the worker's sections; **Reopen** (SETTLED) → back to open. Settled rows show the
  section and `settledAt`.

### Section views gain an Advance column

- `WorkerSectionBreakdown`: add an **Advance** column; the row's net already reflects
  `wage = earnings − accommodation − advance`.
- `AdminSectionWageView`: add an **Advance** column next to Accommodation.

### Worker wages totals

- Replace the old `Advances` + `Net to pay` total cells with a single **Open advances
  (outstanding)** figure. Per-section net (including settled advances) is shown in the
  breakdown. (Net-to-pay across a date range is dropped because advances are section-bound, not
  range-bound.)

## Server actions (`lib/actions/advances.ts`)

Keep `requestAdvanceAction`, `cancelAdvanceAction`, `decideAdvanceAction`,
`markAdvancePaidAction` (markPaid sets `PAID` = open). Add:

```
settleAdvanceAction(fd: { id, sectionId })   // admin
  - requireAdmin(); require advance.status === "PAID"
  - load section; require it belongs to a project the advance's worker is assigned to
    (ProjectWorker(section.projectId, advance.userId) exists) else error
  - set status = SETTLED, sectionId, settledAt = now

reopenAdvanceAction(fd: { id })              // admin
  - requireAdmin(); require advance.status === "SETTLED"
  - set status = PAID, sectionId = null, settledAt = null
```

## RLS / migration

- New migration: add `SETTLED` to the `AdvanceStatus` enum and `sectionId`/`settledAt` columns +
  index + FK to `Section` (ON DELETE SET NULL). (Postgres `ALTER TYPE ... ADD VALUE` for the
  enum; `ALTER TABLE` for columns/FK/index.)
- The existing `AdvanceRequest` RLS SELECT policy (`userId = current_setting('app.user_id')`)
  already scopes the worker to their own advances, including settled ones and the new columns —
  no policy change needed. Reading the settled advance's section name relies on the existing
  `Section` RLS policy (worker sees sections of their projects), which holds because the section
  belongs to a project the worker is assigned to (settle-action invariant).

## i18n (`messages/{en,sk,de,fr,sv}.json`)

- Remove `nav.advances` usage from nav (the item is gone); keep the `advances` namespace for the
  sub-page.
- Add to `advances`: `settle`, `reopen`, `open` (status label for PAID-as-open in this context),
  `section`, `outstanding`, `filterOpen`, `filterSettled`, `filterAll`; add `status.SETTLED`.
- Add `wages.advance` (section column header).

## Testing (`vitest`)

- `computeWagesBySection`: a settled advance for a section is deducted in that section's row
  (`wage = earnings − accommodation − advance`); an advance for a different section is not;
  a section with only a settled advance (no earnings/accommodation) still appears.
- Open-advances outstanding sum: counts only `PAID` advances (not REQUESTED/APPROVED/REJECTED/
  SETTLED).
- Remove/replace the obsolete `sumPaidAdvances` tests.

## Files

**Modify**
- `prisma/schema.prisma` (+ new migration under `prisma/migrations/`)
- `lib/portal/wages.ts` (+ `lib/portal/wages.test.ts`)
- `lib/actions/advances.ts` (settle/reopen actions)
- `app/api/wages/projects/[projectId]/sections/route.ts`
- `app/[locale]/(portal)/wages/page.tsx` (open-advances figure; drop sumPaidAdvances)
- `app/[locale]/(portal)/wages/MyWagesView.tsx` (totals; section column wiring)
- `app/[locale]/(portal)/wages/WorkerSectionBreakdown.tsx` (Advance column)
- `app/[locale]/(portal)/wages/section-row.ts` (no change if `advance` comes via `SectionWageRow`)
- `app/[locale]/(portal)/wages/AdminSectionWageView.tsx` + section page (Advance column + load)
- `lib/portal-nav.ts` (remove `/advances` item)
- `messages/{en,sk,de,fr,sv}.json`

**Move/create**
- Move `app/[locale]/(portal)/advances/*` → `app/[locale]/(portal)/wages/advances/*`
  (`page.tsx`, `MyAdvancesView.tsx`, `AdminAdvancesView.tsx`), extending the admin view with the
  Open/Settled/All filter and Settle/Reopen actions, and the worker view with the settled section
  name.

**Remove**
- `app/[locale]/(portal)/advances/` (old location).

## Out of scope (YAGNI)

- Partial/split advance settlement across multiple sections.
- Multi-currency netting between advance and wage currency (advance amount deducted as-is).
- Range-based advance deduction in the worker's project/overall totals (advances are
  section-bound; per-section nets carry the deduction).
- Automatic suggestions for which section to settle against.
