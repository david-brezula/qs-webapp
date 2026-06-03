# Client Portal — Design Spec

**Date:** 2026-06-03
**Status:** Approved design, pending spec review → implementation plan
**Author:** brainstorming session (qs-web)

## 1. Summary

Add a read-only **client portal** to qs-web, alongside the existing worker/admin
portal. A client (the customer who commissioned a construction site, "stavba")
logs in and sees a current, read-only overview of *their* projects: progress and
status, an auto-derived timeline of section milestones, a photo gallery, and
downloadable documents. Clients never see internal data (wages, prices,
advances, accommodations, worker identities, raw activity logs) or other
clients' projects.

Clients are **admin-invited** (no public signup), reusing the existing
`mustChangePassword` first-login flow. A new `CLIENT` role and a `Client` entity
are introduced. Each project belongs to at most one client.

## 2. Goals / Non-goals

### Goals
- A new `CLIENT` role, gated to a dedicated client area only.
- A `Client` entity; `Project` belongs to one client (nullable for internal jobs).
- Admin UI to manage clients, their login accounts, and project assignment.
- Read-only client UI: dashboard (their projects) + project detail with tabs:
  Progress, Timeline, Gallery, Documents.
- Hard server-side firewall: a single sanitized data layer; clients can only
  reach their own projects' non-sensitive data.
- Photo/document storage via Supabase Storage (private bucket, signed URLs).
- All progress logic reused read-only from existing helpers.

### Non-goals (explicitly out of scope for v1)
- Invoices / any financial figures shown to the client.
- Worker identities, wages, prices, advances, accommodations in any client view.
- Public client self-registration.
- Admin-curated milestones (timeline is auto-derived instead).
- Email notifications (deferred; `lib/mailer.ts` exists, can be added later).
- Client write actions of any kind (comments, approvals, uploads).

## 3. Confirmed decisions

| Decision | Choice |
|---|---|
| Onboarding | **Admin-invited** clients (reuse `mustChangePassword`). No public signup. |
| Project ↔ Client cardinality | **One client per project**; client can have many projects. Simple FK `Project.clientId`. |
| v1 content | Progress & status, **auto-derived timeline**, photo gallery, documents. No invoices. |
| Storage backend | **Supabase Storage** (private bucket, signed download URLs). |
| Layout / branding | **Separate `(client)` route group** with its own presentational layout. |
| Timeline | **Auto-derived from `ActivityLog`** (section start/completion dates). No `ProjectMilestone` model. |
| Security model | **App-level `clientId` filtering** through one sanitized data module (primary boundary), plus proxy gate + `requireClient`. RLS optional hardening later. |
| Locales | New namespace in all 5 files (`sk` default + `en` priority; `de/fr/sv` filled progressively). |

## 4. Architecture overview

A separate client zone (`app/[locale]/(client)/`) with its own layout, served on
the existing portal host (`app.quantum-sphere.eu`). The same NextAuth + next-intl
infrastructure is reused. Access is enforced at three layers:

1. **Proxy** (`proxy.ts`) — role-explicit allow-list (see §6, critical fix).
2. **Page guard** — `requireClient()` resolves and returns the session `clientId`.
3. **Data layer** — `lib/portal/client-projects.ts` is the *only* path to project
   data for clients; every query is filtered by `clientId` and returns sanitized
   DTOs (no Prisma relations, no sensitive fields).

```
Client login (admin-created, mustChangePassword)
  → /portal                      (dashboard: their projects)
  → /portal/[projectId]          (tabs: Progress | Timeline | Gallery | Documents)

Admin
  → /clients, /clients/new, /clients/[id]      (manage clients + accounts + assignment)
  → /projects/[projectId]/edit                 (+ ClientPanel, PhotosPanel, DocumentsPanel)
```

## 5. Data model (Prisma)

Forward migration only — **never reset** the shared local dev DB (see project
memory `qs-web-dev-db-and-main-wip`). Both new FKs are nullable for safe
migration of existing rows.

```prisma
enum Role {
  ADMIN
  WORKER
  CLIENT          // NEW
}

model Client {
  id        String   @id @default(cuid())
  name      String                 // contact person or display name
  company   String?
  email     String?  @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  users     User[]                 // login accounts (v1: typically one)
  projects  Project[]              // a project belongs to one client

  @@index([active])
}

// User: add
//   clientId String?
//   client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)
//   @@index([clientId])

// Project: add
//   clientId String?
//   client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)
//   @@index([clientId])

model ProjectPhoto {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  storageKey String              // object key in the private bucket
  caption    String?
  takenAt    DateTime? @db.Date
  orderIndex Int      @default(0)
  createdAt  DateTime @default(now())

  @@index([projectId])
}

model ProjectDocument {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  storageKey String
  title      String
  mimeType   String?
  sizeBytes  Int?
  createdAt  DateTime @default(now())

  @@index([projectId])
}
```

No `ProjectMilestone` — the timeline is derived (see §9).

## 6. Access & security

### 6.1 Critical fix — proxy gate is deny-by-exception today
`proxy.ts:87` is:
```ts
if (token.role !== "ADMIN" && isBlockedForWorker(strippedPath)) { ... redirect /dashboard }
```
A new `CLIENT` role falls into the non-admin branch and inherits **worker**
access (it would reach `/dashboard`, `/wages`, `/projects/[id]/log`). This must
become role-explicit (allow-list per role) **before anything client-facing
ships**:

```ts
if (token.role === "WORKER" && isBlockedForWorker(strippedPath)) {
  // redirect /dashboard
} else if (token.role === "CLIENT" && !isAllowedForClient(strippedPath)) {
  // redirect /portal   (NOT /dashboard — that is worker/admin-shaped)
}
```

### 6.2 Access predicates (`lib/portal/access.ts`)
- Add `/portal` to `PORTAL_PATHS` so the proxy guards the client area and the
  host-split treats it as a portal path.
- Add pure predicates `isClientPath(p)` and `isAllowedForClient(p)`. Clients may
  reach only `/portal` (+ subpaths) and `/change-password`. Everything in
  `ADMIN_ONLY_PREFIXES` and all worker paths stay blocked.
- Extend `lib/portal/access.test.ts` to cover CLIENT: allowed on `/portal/**`
  and `/change-password`; blocked on `/dashboard`, `/wages`, `/projects`,
  `/workers`, `/accommodations`, `/clients`.

### 6.3 Auth wiring
- `auth.config.ts` — widen role union to `"ADMIN" | "WORKER" | "CLIENT"` in both
  `jwt` (line 19) and `session` (line 31) callbacks; copy `clientId` from user →
  token → session so client queries can scope without an extra DB read.
- next-auth type augmentation — add `CLIENT` to `session.user.role` and add
  optional `session.user.clientId`.
- `lib/portal/session.ts` — add `requireClient()` mirroring `requireAdmin()`:
  redirect non-CLIENT to `/login` (or `/portal`), return `{ ...user, clientId }`.
  Throw/redirect if a CLIENT somehow has no `clientId`.

### 6.4 Sanitized data layer (the firewall)
`lib/portal/client-projects.ts` — the single source of project data for clients.
- `listClientProjects(clientId)` → `ClientProjectSummary[]`
  `{ id, name, location, status, progressPercent, lastActivityAt }`
- `getClientProject(clientId, projectId)` → `ClientProjectDetail | null`
  (returns null if the project's `clientId` ≠ the caller's — ownership check is
  in the query, never in the component)
  `{ id, name, location, status, sections: [{ name, progressPercent,
     tables: [{ name, total, tied, connected, finished }] }],
     timeline: TimelineEvent[], photos: [...], documents: [...] }`

Rules:
- Always `where: { clientId }` (or `where: { id: projectId, clientId }`).
- Never return Prisma models with relations; map to plain DTOs.
- Never include: pricing, wages, advances, accommodations, `SectionInvoice`,
  `TableClaim`, worker names/ids, raw `ActivityLog` rows, `notes`.
- Raw `ActivityLog` rows are read server-side only to compute aggregates and the
  derived timeline; they never cross the DTO boundary.

### 6.5 Storage authorization
- Private Supabase Storage bucket (e.g. `project-files`), object key convention
  `projects/<projectId>/<photos|documents>/<id>-<filename>`.
- Download: a server route/action verifies `projectId` belongs to the caller's
  `clientId`, then issues a short-lived signed URL. No public URLs.
- Upload: admin-only server actions (see §8). Clients never upload.

## 7. Client UI (`app/[locale]/(client)/`)

- `(client)/layout.tsx` — own presentational shell: logo, project switcher,
  locale switcher, sign-out. No admin sidebar. Reuse `NextIntlClientProvider`
  and the `mustChangePassword` redirect pattern from the portal layout.
- `/portal` — **dashboard**: card/list of the client's projects (name, location,
  ACTIVE/CLOSED, overall progress bar, last-updated date).
- `/portal/[projectId]` — **project detail**, tabs:
  - **Progress** — overall progress bar + per-section breakdown; per-table
    finished/in-progress with "X / Y modules". Reuse `ProgressGraph`,
    `computeProgress`, `toPercent`, `isTableFinished`, `computeModules`,
    `getTableAggregates`.
  - **Timeline** — derived event feed (see §9).
  - **Gallery** — photo grid (signed URLs, captions).
  - **Documents** — list with title/size/type and a signed download link.
- Build a read-only `ClientSectionTables` (do NOT reuse `SectionTables.tsx` /
  `TableLogger.tsx` — they carry claims, worker names, and claim/log actions).

## 8. Admin UI

Mirror the existing `/workers` + per-project `WorkersPanel` pattern.

- **`/clients`** — list of clients (name, company, #projects, active).
- **`/clients/new`** — create a client *and* its login account in one step
  (username, name, email; sets `role=CLIENT`, `mustChangePassword=true`, links
  `User.clientId`). Reuse the worker-creation/password pattern.
- **`/clients/[id]`** — edit client; assign/unassign projects; (de)activate
  account; reset password.
- **`/projects/[projectId]/edit`** — add panels beside `WorkersPanel`:
  - `ClientPanel` — assign/clear the project's client.
  - `PhotosPanel` — upload/caption/reorder/delete `ProjectPhoto`.
  - `DocumentsPanel` — upload/title/delete `ProjectDocument`.
- `lib/portal-nav.ts` — add `clients` to the ADMIN nav and the `clients` key to
  the `PortalNavItem.labelKey` union. Widen `getPortalNavItems` signature to
  accept `CLIENT` (TypeScript: `user.role` now includes it) and return `[]` for
  `CLIENT` — clients use their own `(client)` layout/nav, never this sidebar.
- New admin server actions: `lib/actions/clients.ts` (CRUD + account creation +
  project assignment) and `lib/actions/project-files.ts` (upload/delete photos &
  documents, admin-only via `requireAdmin`).

## 9. Derived timeline (no new model)

Computed in the sanitized data layer from each project's `ActivityLog`
(`workDate`, `action`, `count`, `tableId`) joined to its sections/tables.
Per **section**:
- `status`: `NOT_STARTED` (no logs) | `IN_PROGRESS` | `DONE`.
- `startedAt` = min `workDate` over the section's tables.
- `completedAt` = the `workDate` at which the section first reached 100%
  (all its tables have tied ≥ total AND connected ≥ total). Compute by ordering
  the section's logs by `(workDate, createdAt)`, accumulating tied/connected per
  table, and recording the date the section first becomes fully finished;
  `null` if not yet finished.
- `lastActivityAt` = max `workDate`.

Project-level **timeline** = ordered events:
- `PROJECT_STARTED` at `Project.createdAt`.
- `SECTION_STARTED` / `SECTION_COMPLETED` per section (by date).
- `PROJECT_CLOSED` at `Project.closedAt` when `status = CLOSED`.

The feed exposes only dates + section names + event type. No worker, count, or
amount data leaves the server.

Note: dates reveal work *pace* (gaps between activity). This is accepted per the
chosen "auto-derived" option; it never reveals who worked or how much.

## 10. i18n

- New non-colliding namespace **`clientPortal`** in all 5 message files
  (`messages/{sk,en,de,fr,sv}.json`). `sk` (default) + `en` written first;
  `de/fr/sv` filled progressively. (Per memory `qs-web-i18n-namespaces`:
  must not collide with `projects`/`portalProjects`.)
- New `nav` keys for the admin `clients` entry in all 5 files.
- Client routes use stable static English slugs (`/portal`, `/portal/[id]`),
  matching the existing portal convention in `lib/i18n/routing.ts`.

## 11. Reuse map

| Reuse as-is (pure, safe) | Reuse with sanitized data path | Do NOT reuse |
|---|---|---|
| `lib/portal/progress.ts` | `components/portal/ProgressGraph.tsx` | `components/portal/SectionTables.tsx` |
| `lib/portal/table-status.ts` | `ProjectSectionList`/`SectionList` shapes | `.../log/TableLogger.tsx` |
| `lib/portal/modules.ts` | (feed them client DTOs) | `lib/portal/wages.ts` |
| `lib/portal/activity-aggregates.ts` (`getTableAggregates`) | | `lib/actions/{advances,accommodations,section-invoice}.ts` |
| `mustChangePassword` flow | | `lib/prisma-worker.ts` (`withWorkerScope` is worker-keyed) |

## 12. Migration & rollout

1. Prisma migration: add `CLIENT` enum value, `Client`, `ProjectPhoto`,
   `ProjectDocument`, and nullable `Project.clientId` / `User.clientId`. Forward
   migration; do not `migrate reset`.
2. Create the private Supabase Storage bucket + policies.
3. Ship the proxy/access/auth changes (with tests) — the security fix lands with
   or before the first client route.
4. Backfill: optionally assign existing projects to clients via the admin UI.

## 13. Testing

- Unit: extend `lib/portal/access.test.ts` for CLIENT allow/deny matrix.
- Unit: derived-timeline computation (section start/complete edge cases:
  no logs, partial, exactly-at-cap, over multiple dates).
- Unit/integration: `client-projects.ts` ownership filter (a client cannot fetch
  another client's project; sensitive fields absent from DTOs).
- Integration: storage authorization (signed URL only for owned project).

## 14. Risks

- **#1 proxy deny-by-exception** (§6.1) — addressed first; covered by tests.
- Data leakage via accidental Prisma relation passthrough — mitigated by the
  single DTO data layer and "never pass Prisma models to client components".
- Namespace collision in messages — mitigated by the fresh `clientPortal`
  namespace and the memory note.
- Shared dev DB — forward-only migration.

## 15. Suggested build sequence (for the plan)

1. Schema + migration (`CLIENT`, `Client`, FKs, photo/document models).
2. Auth/role plumbing (`auth.config.ts`, type augmentation, `requireClient`).
3. Access predicates + **proxy role-explicit gate** + tests.
4. Sanitized data layer `client-projects.ts` + derived timeline + tests.
5. Client `(client)` layout + dashboard + project detail (Progress tab).
6. Supabase Storage wiring + Gallery + Documents tabs (signed URLs).
7. Admin `/clients` section + account creation + project assignment.
8. Admin per-project panels (Client, Photos, Documents).
9. i18n namespace + nav across all 5 locales.
10. Test pass + verification.
