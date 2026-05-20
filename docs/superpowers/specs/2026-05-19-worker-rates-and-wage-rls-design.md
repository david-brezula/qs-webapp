# Per-Worker Default Rates + Worker-Facing Wages with Postgres RLS

**Date:** 2026-05-19
**Status:** Approved

## Problem

Per-worker tie/connect rates already exist as `ProjectWorker.priceTie` /
`ProjectWorker.priceConnect`, set by admins per project on the project-edit page
(`WorkersPanel.tsx`). Two gaps remain:

1. **No per-worker default.** Every project assignment requires re-entering a
   worker's rates from scratch, even though most workers are paid the same
   across projects.
2. **Workers cannot see their own wages.** The `/wages` page is admin-only
   (`requireAdmin()`), and the `WORKER` navigation only exposes `/dashboard`.
   A worker has no way to see what they earned.

The data isolation must be enforced by the database, not only by application
code: a worker must never be able to read another worker's wage rows.

## Goal

- Give each worker a **default tie/connect rate** that seeds new project
  assignments; admins can still override per project.
- Add a **worker-facing wages page**: each worker sees only their own totals
  plus a per-project breakdown, read-only.
- Enforce isolation with **PostgreSQL Row Level Security** on the
  worker-facing wage read path.

## Scope

Three coordinated pieces, designed and implemented together:

- **A.** Per-worker default rates (data model + admin UI).
- **B.** Worker-facing wages page.
- **C.** Postgres RLS for the worker wage read path.

## A. Per-Worker Default Rates

### Data model

Add to the `User` model in `prisma/schema.prisma`:

```prisma
defaultPriceTie     Decimal @db.Decimal(10, 2) @default(0)
defaultPriceConnect Decimal @db.Decimal(10, 2) @default(0)
```

Migration: `add_worker_default_rates`. `@default(0)` keeps every existing row
valid.

`ProjectWorker.priceTie` / `ProjectWorker.priceConnect` are **unchanged** — they
remain the per-project override. The default is a *seed only*: editing a
worker's default never retroactively changes existing `ProjectWorker` rows.

### Admin UI

**Worker profile** (`app/(app)/workers/[userId]/EditWorkerForm.tsx` and
`page.tsx`): two new number inputs — "Default tie rate" and "Default connect
rate" — alongside the existing fields. The existing update server action in
`lib/actions/workers.ts` is extended to accept and persist both values. Action
stays admin-gated (`requireAdmin()`).

**WorkersPanel** (`app/(app)/projects/[projectId]/edit/WorkersPanel.tsx` and the
edit `page.tsx`): the "available workers" dropdown already exists. The edit page
will carry each available worker's `defaultPriceTie` / `defaultPriceConnect` in
that list. When the admin selects a worker to assign, the tie/connect inputs
pre-fill from that worker's defaults. The admin can type over them before
assigning, and the existing inline per-row rate edit is unchanged.

## B. Worker-Facing Wages Page

The `/wages` route is reused with a role branch — one route, one nav item —
rather than a second route.

### `app/(app)/wages/page.tsx` (modified)

- Gate changes from `requireAdmin()` to `requireUser()`.
- `ADMIN` → renders the existing `WagesView` (all workers), fed by the existing
  owner database connection. Unchanged behaviour.
- `WORKER` → renders a new `MyWagesView`, fed exclusively by the RLS-scoped
  worker connection (see section C).

### `app/(app)/wages/MyWagesView.tsx` (new)

A client component, structured like the existing `WagesView`:

- A date-range filter (`from` / `to`), defaulting to the current day, matching
  the admin page.
- The worker's own totals: tie, connect, earnings, accommodation, final wage.
- One breakdown row per project the worker had activity on within the range.

The worker view is **read-only** — it never edits rates.

### `lib/portal-nav.ts` (modified)

Add `{ href: "/wages", labelKey: "wages" }` to the `WORKER` navigation list so
workers can reach the page.

### Out of scope for B

CSV export (`app/(app)/wages/export.csv/route.ts`) stays admin-only. Worker
self-export is not part of this work.

## C. Postgres RLS Architecture

RLS protects the **worker-facing wage read path**. All writes — including
workers logging activity through `lib/actions/activity.ts` — continue through
the existing owner connection in already-authorized server actions. RLS here is
defense-in-depth for the wage display, not a rewrite of every query.

### Two database roles

- **Owner role** (the existing `DATABASE_URL` role): owns the tables. RLS is
  turned on with `ENABLE ROW LEVEL SECURITY` and **not** `FORCE ROW LEVEL
  SECURITY`, so the table owner bypasses RLS automatically. This is the key
  decision that leaves every existing admin page and server action untouched.
- **`qs_worker` role** (new): `LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, with
  `SELECT`-only grants on the eight wage-read tables and no grant at all on
  `TableClaim` / `ContactSubmission`. Created by a setup script (below);
  password supplied via environment.

### Worker-scoped Prisma client

- `lib/prisma-worker.ts` (new): a second `PrismaClient` built with a `PrismaPg`
  adapter over a new `DATABASE_URL_WORKER` connection string (the `qs_worker`
  credentials). Follows the singleton pattern of the existing `lib/prisma.ts`.
- `withWorkerScope(userId, fn)` (in `lib/prisma-worker.ts`): runs `fn` inside an
  interactive transaction whose first statement is
  `SELECT set_config('app.user_id', $userId, true)`. The `true` makes the
  setting transaction-local, so it is safe under connection pooling. Every
  worker-facing read goes through this helper.

### Policies

Migration `enable_wage_rls` runs, for each of the eight tables the worker page
reads, `ENABLE ROW LEVEL SECURITY` plus a `SELECT` policy:

| Table | Policy `USING` predicate (conceptually) |
|---|---|
| `User` | `id = current_setting('app.user_id', true)` |
| `ProjectWorker` | `"userId" = current_setting('app.user_id', true)` |
| `ActivityLog` | `"projectWorkerId"` belongs to one of the current worker's `ProjectWorker` rows |
| `Project` | `id` is a project the current worker has a `ProjectWorker` row on |
| `Section` | `"projectId"` is a project the current worker is assigned to |
| `Table` | `"sectionId"` belongs to a section of one of the worker's projects |
| `AccommodationWorker` | `"accommodationId"` is an accommodation the current worker belongs to |
| `Accommodation` | `id` is an accommodation the current worker belongs to |

`current_setting('app.user_id', true)` uses the missing-ok argument: when the
context is unset, the predicate compares against `NULL` and yields **zero rows**
— deny-by-default.

`AccommodationWorker` is intentionally visible for all members of an
accommodation the worker belongs to, so the worker page can count co-members to
split `totalCost`. That join table carries no wage or rate data; rates live in
`ProjectWorker` and per-worker production lives in `ActivityLog`, both of which
are strictly self-scoped.

### Role and grant setup

`scripts/setup-rls-role.sql` (new): creates the `qs_worker` role and runs the
`GRANT USAGE ON SCHEMA public` + per-table `GRANT SELECT`. The password is
supplied as a `psql` variable rather than hard-coded. Grants live here — not in
the Prisma migration — so the migration has no dependency on the role existing.

Ordering per environment: run `prisma migrate deploy` (creates tables, enables
RLS, creates policies), then run `setup-rls-role.sql` (creates the role, grants
`SELECT`). Documented in the implementation plan and `.env.example`.

### Environment

A new `DATABASE_URL_WORKER` variable holds the `qs_worker` connection string.
Added to `.env.example` with a comment.

## Data Flow

### Admin wages (unchanged)

`wages/page.tsx` → owner `prisma` client → `computeWages` → `WagesView`.

### Worker wages (new)

`wages/page.tsx` (role `WORKER`) → `withWorkerScope(session.user.id, …)` on the
`prismaWorker` client → queries return only the worker's own rows (RLS) →
per-project breakdown helper → `MyWagesView`.

## Wage Computation

`computeWages` in `lib/portal/wages.ts` is already pure and unit-tested; it is
left untouched. A thin new helper — `computeWagesByProject`, added to
`lib/portal/wages.ts` — produces the worker page's shape:

- One `computeWages` call with `projectId: null` for the overall totals.
- One `computeWages` call per project the worker touched, for each breakdown
  row.

Because the worker query is RLS-scoped, its `WageInput` already contains only
the worker's own rows; no additional filtering is needed in application code.

## Error Handling / Edge Cases

- **Unset RLS context:** policies deny-by-default — zero rows, never an error or
  a leak.
- **Worker with no activity in range:** `MyWagesView` shows zero totals and an
  empty breakdown, consistent with the admin page's empty state.
- **Worker not assigned to any project:** the page renders with zero totals.
- **`current_setting` typing:** `app.user_id` is a text setting; policy
  predicates compare it against the text `id` / `userId` columns directly.
- **Missing per-project rate:** unchanged — `computeWages` already emits a
  `missing-price` warning, surfaced in `MyWagesView` as it is in `WagesView`.

## Key Risk — Verify First

The `ENABLE`-not-`FORCE` approach relies on `DATABASE_URL` connecting as the
**table owner** (owners bypass non-forced RLS). If the app connects as a
non-owner role without `BYPASSRLS`, every admin query would start returning
empty rows after the migration.

The implementation plan's first step verifies the connecting role owns the
tables (or has `BYPASSRLS`). If it does not, the owner is granted explicit
`BYPASSRLS` as part of `setup-rls-role.sql`.

## Testing

- **Unit tests** for `computeWagesByProject` (pure logic, in the existing
  vitest suite alongside `lib/portal/wages.test.ts`).
- **`scripts/verify-rls.mjs`** (new): connects as `qs_worker`, sets one
  worker's `app.user_id`, and asserts (a) it sees only that worker's
  `ProjectWorker` / `ActivityLog` rows, and (b) with no context set, it sees
  zero rows. A runnable proof the policies isolate correctly.
- Existing vitest suites stay green; `npm run lint` and `npm run build` pass.

## Files Touched

**New**

- `prisma/migrations/<ts>_add_worker_default_rates/migration.sql`
- `prisma/migrations/<ts>_enable_wage_rls/migration.sql`
- `lib/prisma-worker.ts`
- `app/(app)/wages/MyWagesView.tsx`
- `scripts/setup-rls-role.sql`
- `scripts/verify-rls.mjs`

**Modified**

- `prisma/schema.prisma` — `User.defaultPriceTie`, `User.defaultPriceConnect`
- `lib/actions/workers.ts` — persist default rates
- `app/(app)/workers/[userId]/EditWorkerForm.tsx`, `page.tsx` — default rate inputs
- `app/(app)/projects/[projectId]/edit/WorkersPanel.tsx`, `page.tsx` — pre-fill from defaults
- `app/(app)/wages/page.tsx` — role branch
- `lib/portal/wages.ts` — add `computeWagesByProject`
- `lib/portal/wages.test.ts` — tests for the new helper
- `lib/portal-nav.ts` — `wages` entry for the `WORKER` role
- `messages/en.json`, `messages/sk.json` — new i18n strings
- `.env.example` — `DATABASE_URL_WORKER`

## Out of Scope

- RLS on any path other than the worker-facing wage read (writes and admin
  reads keep using the owner connection).
- Worker CSV export.
- Workers editing their own rates (always admin-only).
- Any change to the worker dashboard or to activity logging.
- A "reset project rate to default" control — the inline per-project edit and
  the assign-time pre-fill are sufficient.
