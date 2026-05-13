# Worker Portal — Design

**Date:** 2026-05-13
**Status:** Approved by user, ready for implementation planning

## Goal

Add an internal worker portal to the existing Quantum Sphere Next.js app so the admin can structure projects (sections → tables of solar panels), assign workers with per-project per-action prices, track accommodation bookings (Airbnb-style group stays), and compute wages = earnings − accommodation share over a date range.

The public landing site is untouched.

## Roles

- **Admin** — one or a few accounts in practice. Full CRUD across users, projects, sections, tables, prices, accommodations, wages.
- **Worker** — logs in, sees only the projects they're assigned to, logs daily tie/connect counts on tables. Edits own logs for 24 hours.

## Module formula

For each table: `modules = rows × cols − skipped` (A × B − C). Stored as three integers, modules is computed (not persisted).

## Logging model

Per-table counters. Workers don't click individual panels — they enter "I tied N today" / "I connected M today" against a table, with a work date (defaults to today). Many workers can contribute to the same table; sums roll up at the table level.

**Invariant:** `SUM(ActivityLog.count) for any (tableId, action) ≤ table.modules`. Trying to push over the cap returns a validation error.

## Pricing model

`ProjectWorker` is a join row carrying the prices: each (project, worker) pair has its own `priceTie` and `priceConnect`. There are no global per-worker defaults — admin sets prices when assigning a worker to a project. If a price is missing the wage line shows `—` with a warning row.

## Accommodation model

`Accommodation` represents a single Airbnb (or similar) booking: `name`, `startDate`, `endDate`, `totalCost`, `currency`, `notes`, plus a many-to-many to users.

Cost split: **equal across all assigned workers.** Each assigned worker owes `totalCost / numberOfAssignedWorkers`, regardless of how many nights they actually slept.

Deduction rule for a wages date range `[from, to]`: if `Accommodation.startDate ≤ to AND Accommodation.endDate ≥ from` (any overlap), the worker's full share is deducted from that range's wage.

## Pay periods

No formal pay period entity. Admin opens the wages screen, picks `from`/`to`, sees per-worker breakdown. Read-only view; recomputes on every load. No locking.

## Tech stack

- **Persistence:** Postgres (Neon or Supabase, dev uses local Postgres or a Neon dev branch). Prisma ORM. Migrations via `prisma migrate`.
- **Auth:** Auth.js v5 (NextAuth) with Credentials provider, JWT session strategy, bcrypt for password hashing.
- **Server interactions:** Next.js server actions (no REST routes other than `/api/auth/*`).
- **Validation:** zod for every server action input.
- **i18n:** `next-intl` with `en` and `sk` locales; per-user preference stored on `User.language`.
- **UI:** Reuse existing Tailwind tokens and primitives (`Container`, `Button`, `Card`, `SectionHeading`). Add one new primitive: `DataTable` (simple thead/tbody renderer, no client-side sort in v1).

## Architecture

Single Next.js app, two route groups:

```
app/
  (public)/        existing marketing site, untouched
  (app)/           authenticated portal — distinct layout, no marketing Nav/Footer
```

Auth boundary is enforced by `middleware.ts`: unauthenticated request to `(app)` → redirect to `/login`. Worker request to admin-only routes → 403 page.

## Data model (Prisma schema)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(WORKER)
  language     Locale   @default(EN)
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())

  projectWorkers       ProjectWorker[]
  activityLogs         ActivityLog[]
  accommodationStays   AccommodationWorker[]
}

enum Role   { ADMIN WORKER }
enum Locale { EN SK }

model Project {
  id        String        @id @default(cuid())
  name      String
  location  String?
  status    ProjectStatus @default(ACTIVE)
  createdAt DateTime      @default(now())
  closedAt  DateTime?

  sections        Section[]
  projectWorkers  ProjectWorker[]
  accommodations  Accommodation[]
}

enum ProjectStatus { ACTIVE CLOSED }

model Section {
  id         String  @id @default(cuid())
  projectId  String
  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name       String
  orderIndex Int     @default(0)

  tables Table[]

  @@index([projectId])
}

model Table {
  id         String   @id @default(cuid())
  sectionId  String
  section    Section  @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  name       String
  rows       Int      // A
  cols       Int      // B
  skipped    Int      @default(0) // C
  orderIndex Int      @default(0)
  createdAt  DateTime @default(now())

  activityLogs ActivityLog[]

  @@index([sectionId])
}

model ProjectWorker {
  id           String  @id @default(cuid())
  projectId    String
  userId       String
  priceTie     Decimal @db.Decimal(10, 2)
  priceConnect Decimal @db.Decimal(10, 2)
  createdAt    DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId],    references: [id], onDelete: Cascade)
  logs    ActivityLog[]

  @@unique([projectId, userId])
  @@index([userId])
}

model ActivityLog {
  id              String         @id @default(cuid())
  projectWorkerId String
  tableId         String
  action          ActivityAction
  count           Int
  workDate        DateTime       @db.Date
  notes           String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  projectWorker ProjectWorker @relation(fields: [projectWorkerId], references: [id], onDelete: Cascade)
  table         Table         @relation(fields: [tableId], references: [id], onDelete: Cascade)

  @@index([projectWorkerId, workDate])
  @@index([tableId, action])
}

enum ActivityAction { TIE CONNECT }

model Accommodation {
  id        String   @id @default(cuid())
  projectId String?
  project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  name      String
  startDate DateTime @db.Date
  endDate   DateTime @db.Date
  totalCost Decimal  @db.Decimal(10, 2)
  currency  Currency @default(USD)
  notes     String?
  createdAt DateTime @default(now())

  workers AccommodationWorker[]

  @@index([projectId])
  @@index([startDate, endDate])
}

enum Currency { USD EUR }

model AccommodationWorker {
  id              String @id @default(cuid())
  accommodationId String
  userId          String

  accommodation Accommodation @relation(fields: [accommodationId], references: [id], onDelete: Cascade)
  user          User          @relation(fields: [userId],          references: [id], onDelete: Cascade)

  @@unique([accommodationId, userId])
  @@index([userId])
}
```

`ActivityLog` does not have a direct `User` relation; the worker is reached via `activityLog.projectWorker.user`. This keeps prices and ownership unified on the join row.

## Routes & UI

```
app/
  (public)/                                  unchanged
  (app)/
    layout.tsx                               portal shell: auth check, locale, sidebar
    login/page.tsx                           email + password, locale toggle
    logout/route.ts                          POST → clear session → /login
    dashboard/page.tsx                       worker home: their assigned projects
    projects/
      page.tsx                               admin: project list with stats
      new/page.tsx                           admin: create project
      [projectId]/
        page.tsx                             shared overview (sections + tables + progress)
        log/page.tsx                         worker: log tie/connect for tables in this project
        edit/page.tsx                        admin: project settings, sections, tables, workers, prices
    workers/
      page.tsx                               admin: user list
      new/page.tsx                           admin: create worker (sets temp password)
      [userId]/page.tsx                      admin: edit worker
    accommodations/
      page.tsx                               admin: list
      new/page.tsx                           admin: create
      [id]/page.tsx                          admin: edit
    wages/page.tsx                           admin: date range → breakdown table + CSV export
  api/
    auth/[...nextauth]/route.ts              Auth.js
```

`middleware.ts` enforces:
- `(public)` — no auth required
- `(app)/login` — no auth required
- `(app)/*` — must be authenticated; redirect to `/login` if not
- `(app)/projects`, `/workers`, `/accommodations`, `/wages`, `**/edit`, `**/new` — admin-only; 403 for workers

## Wage calculation (canonical)

Given `(from, to, optional projectId)`:

```ts
for each worker W:
  earnings = 0
  for each ActivityLog L where L.user = W AND L.workDate in [from, to]
                              AND (projectId is null OR L.table.section.project = projectId):
    price = (L.action == TIE) ? L.projectWorker.priceTie : L.projectWorker.priceConnect
    earnings += L.count * price
  accommodation_share = 0
  for each Accommodation A where W in A.workers
                                AND A.startDate <= to AND A.endDate >= from
                                AND (projectId is null OR A.projectId == projectId):
    accommodation_share += A.totalCost / count(A.workers)
  wage = earnings - accommodation_share
  emit row { worker: W, earnings, accommodation_share, wage }
```

If a worker logged activity but a ProjectWorker price is missing for that action, that line of earnings is `null` and the row shows a warning instead of a number.

## Error handling & edge cases

- **Over-cap logging** — server action returns 400 with message "This table is already at N/M for tie/connect."
- **Worker not on project** — server action returns 403; UI never offers the form.
- **Past-log edit** — worker can edit own log within 24h of `createdAt`; admin always.
- **Closed project** — workers can't add logs; admin can still edit existing.
- **Soft-delete** — workers are deactivated (`active=false`), not deleted. Closed projects are `status=CLOSED`. Hard delete is an admin DB operation, out of UI scope.
- **Missing price** — wage row shows warning; activity is preserved.
- **Currency** — accommodations carry their own currency; wages screen displays the dominant currency for the worker (most common ProjectWorker price's implicit unit — actually prices are unit-less Decimals; the UI labels them as "$" by default and the admin sees a footnote that currency normalization is out of v1 scope).

**Currency caveat (explicit):** v1 treats `ProjectWorker.price*` and `Accommodation.totalCost` as the same currency for math purposes. If projects and accommodations have mixed currencies, the wages screen shows a warning "Mixed currencies in this range — figures are nominal." Currency normalization (FX) is out of scope.

## i18n strategy

- `next-intl` with two locales.
- All user-facing strings keyed in `messages/en.json` and `messages/sk.json`.
- Locale resolution order: `User.language` (when authenticated) → `?lang=` query → `Accept-Language` header → `en`.
- Locale switcher visible on login screen and in the portal sidebar.
- The public marketing site stays English-only (does not opt into next-intl); the route group split keeps the marketing layout free of i18n machinery.

## Out of scope (explicit)

- Per-module audit (the click-each-panel UI variant)
- Photo uploads / attachments / comments per table
- Self-signup, email-based password reset (admin sets temp passwords in v1)
- Mobile app
- Real-time multi-user updates / websockets
- Payroll exports beyond CSV from the wages screen
- Audit log of admin actions
- FX / currency normalization
- Email notifications
- Role beyond admin/worker (no foreman tier)

## Success criteria

- `npm run dev` boots the portal at `/login`.
- Admin can: create projects, sections, tables (with A/B/C), workers (with login), assign workers to projects with prices, create accommodation bookings, see wages for any date range with CSV export.
- Worker can: log in, see only their projects, log tie/connect counts on tables, edit their own logs within 24h.
- Over-cap logs are rejected.
- Public landing site at `/` and `/contact` continues to work, unchanged.
- Languages: every portal string renders correctly in `en` and `sk`.
- Unit-tested: wage calculation, over-cap invariant, accommodation share math.
