# Client Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only, admin-invited client portal where a customer logs in and sees the current overview of *their* construction projects — progress/status, an auto-derived timeline, a photo gallery, and downloadable documents — with internal data (wages, prices, advances, accommodations, worker identities, raw logs) hard-firewalled.

**Architecture:** A new `CLIENT` role and `Client` entity; `Project.clientId` links each project to one client. A separate `(client)` route group with its own presentational layout serves `/portal`. Access is gated at three layers: a role-explicit proxy allow-list, a `requireClient()` page guard, and a single sanitized data module (`lib/portal/client-projects.ts`) that filters by `clientId` and returns plain DTOs (never Prisma models). Photos/documents live in a private Supabase Storage bucket, served via short-lived signed URLs. The timeline is derived from `ActivityLog` server-side; raw rows never leave the server.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), next-auth v5 (JWT), Prisma 7 + Postgres (adapter-pg), next-intl (5 locales), Vitest (node env), Supabase Storage (`@supabase/supabase-js`), Tailwind 4, zod, bcryptjs.

**Spec:** `docs/superpowers/specs/2026-06-03-client-portal-design.md`

**Critical caveat (do not skip):** `proxy.ts` is deny-by-exception today (`token.role !== "ADMIN" && isBlockedForWorker(path)`). A `CLIENT` would inherit worker access. Task 4 rewrites this to a role-explicit allow-list. The access predicates (Task 3) land first with tests; the proxy change depends on them.

**DB caveat:** The local dev Supabase DB is shared and must **never** be reset (`prisma migrate reset` is forbidden). Use forward migrations only (`prisma migrate dev`).

---

## File Structure

**New files**
- `lib/portal/timeline.ts` — pure derived-timeline logic (+ `lib/portal/timeline.test.ts`)
- `lib/portal/client-projects.ts` — sanitized client data layer (+ `lib/portal/client-projects.test.ts`)
- `lib/storage.ts` — Supabase Storage helper (upload / signed URL / delete)
- `lib/actions/clients.ts` — admin client CRUD + login creation + project assignment
- `lib/actions/project-files.ts` — admin photo/document upload + delete
- `lib/actions/client-files.ts` — client-scoped signed-URL action for document downloads
- `app/[locale]/(client)/layout.tsx` — client shell (own branding, no admin sidebar)
- `components/client/ClientTopBar.tsx`, `components/client/ProjectSwitcher.tsx`
- `app/[locale]/(client)/portal/page.tsx` — client dashboard (their projects)
- `app/[locale]/(client)/portal/[projectId]/page.tsx` — project detail (tabs)
- `components/client/ClientProjectTabs.tsx`, `components/client/ClientSectionTables.tsx`, `components/client/ClientTimeline.tsx`, `components/client/ClientGallery.tsx`, `components/client/ClientDocuments.tsx`
- `app/[locale]/(portal)/clients/page.tsx`, `app/[locale]/(portal)/clients/new/page.tsx`, `app/[locale]/(portal)/clients/[clientId]/page.tsx`, `app/[locale]/(portal)/clients/[clientId]/EditClientForm.tsx`
- `app/[locale]/(portal)/projects/[projectId]/edit/ClientPanel.tsx`, `.../PhotosPanel.tsx`, `.../DocumentsPanel.tsx`

**Modified files**
- `prisma/schema.prisma` — `Role.CLIENT`, `Client`, FKs, `ProjectPhoto`, `ProjectDocument`
- `types/next-auth.d.ts` — widen role union + `clientId`
- `auth.ts` — return `clientId` from `authorize`
- `auth.config.ts` — carry `clientId` through jwt/session callbacks
- `lib/portal/access.ts` — `/portal` + `/clients` paths, `isClientPath`, `isAllowedForClient` (+ tests in `access.test.ts`)
- `proxy.ts` — role-explicit gate
- `lib/portal/session.ts` — `requireClient()`
- `lib/portal-nav.ts` — `clients` nav item + widen role union
- `components/portal/Sidebar.tsx`, `components/portal/TopBar.tsx`, `components/portal/MobileNav.tsx` — widen `role` prop union
- `app/[locale]/(portal)/projects/[projectId]/edit/page.tsx` — mount Client/Photos/Documents panels
- `messages/{sk,en,de,fr,sv}.json` — `clientPortal` + `clients` namespaces, `nav.clients`
- `package.json` / `.env` — `@supabase/supabase-js`, Supabase env vars

---

## Task 1: Schema — CLIENT role, Client entity, project link, media models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `CLIENT` to the Role enum**

In `prisma/schema.prisma`, change:
```prisma
enum Role {
  ADMIN
  WORKER
  CLIENT
}
```

- [ ] **Step 2: Add the `Client` model and link `User`**

Add a new model and extend `User` with a nullable client link:
```prisma
model Client {
  id        String   @id @default(cuid())
  name      String
  company   String?
  email     String?  @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  users    User[]
  projects Project[]

  @@index([active])
}
```
In `model User { ... }` add (after `createdAt`):
```prisma
  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  @@index([clientId])
```
(Keep the existing relation fields `projectWorkers`, `accommodationStays`, `advanceRequests`. Add the `@@index` alongside any existing block-level attributes.)

- [ ] **Step 3: Link `Project` to a client and add media relations**

In `model Project { ... }` add:
```prisma
  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  photos    ProjectPhoto[]
  documents ProjectDocument[]

  @@index([clientId])
```

- [ ] **Step 4: Add `ProjectPhoto` and `ProjectDocument`**

Append:
```prisma
model ProjectPhoto {
  id         String    @id @default(cuid())
  projectId  String
  project    Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  storageKey String
  caption    String?
  takenAt    DateTime? @db.Date
  orderIndex Int       @default(0)
  createdAt  DateTime  @default(now())

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

- [ ] **Step 5: Create and apply the forward migration**

Run: `npm run db:migrate -- --name client_portal`
Expected: a new folder under `prisma/migrations/` is created and applied; output ends with "Your database is now in sync with your schema." and `prisma generate` runs.
Do NOT run `prisma migrate reset`.

- [ ] **Step 6: Verify the client compiles against the new schema**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). The generated Prisma client now exposes `Role.CLIENT`, `prisma.client`, `prisma.projectPhoto`, `prisma.projectDocument`, and `clientId` fields.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(client-portal): schema for Client, project link, photo/document models"
```

---

## Task 2: Auth — carry role+clientId through next-auth

**Files:**
- Modify: `types/next-auth.d.ts`
- Modify: `auth.ts:26-33`
- Modify: `auth.config.ts:15-35`

- [ ] **Step 1: Widen the next-auth type augmentation**

Replace the contents of `types/next-auth.d.ts` with:
```ts
import type { DefaultSession } from "next-auth";

type PortalRole = "ADMIN" | "WORKER" | "CLIENT";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: PortalRole;
      language: "EN" | "SK";
      clientId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    username?: string;
    role: PortalRole;
    language: "EN" | "SK";
    clientId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: PortalRole;
    language: "EN" | "SK";
    clientId: string | null;
  }
}
```

- [ ] **Step 2: Return `clientId` from `authorize`**

In `auth.ts`, the `authorize` callback returns a user object. Change the returned object (currently lines 26-33) to include `clientId`:
```ts
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
          language: user.language,
          clientId: user.clientId,
        };
```

- [ ] **Step 3: Carry `clientId` through the jwt + session callbacks**

In `auth.config.ts`, inside the `jwt` callback's `if (user)` block, add:
```ts
        token.clientId = (user as { clientId?: string | null }).clientId ?? null;
```
And in the `session` callback's `if (session.user)` block, add:
```ts
        session.user.clientId = (token.clientId as string | null) ?? null;
```
Also widen the inline role casts in both callbacks from `"ADMIN" | "WORKER"` to `"ADMIN" | "WORKER" | "CLIENT"`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add types/next-auth.d.ts auth.ts auth.config.ts
git commit -m "feat(client-portal): carry role+clientId through next-auth session"
```

---

## Task 3: Access predicates for the client surface (TDD)

**Files:**
- Modify: `lib/portal/access.ts`
- Test: `lib/portal/access.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/portal/access.test.ts`:
```ts
import { isClientPath, isAllowedForClient } from "./access";

describe("isClientPath", () => {
  it("matches the client area and its sub-paths", () => {
    expect(isClientPath("/portal")).toBe(true);
    expect(isClientPath("/portal/abc")).toBe(true);
  });
  it("does not match internal portal or marketing paths", () => {
    expect(isClientPath("/dashboard")).toBe(false);
    expect(isClientPath("/wages")).toBe(false);
    expect(isClientPath("/")).toBe(false);
  });
});

describe("isAllowedForClient (the proxy allow-list for CLIENT)", () => {
  it("allows only the client area and change-password", () => {
    expect(isAllowedForClient("/portal")).toBe(true);
    expect(isAllowedForClient("/portal/abc")).toBe(true);
    expect(isAllowedForClient("/change-password")).toBe(true);
  });
  it("blocks every internal/admin/worker path", () => {
    expect(isAllowedForClient("/dashboard")).toBe(false);
    expect(isAllowedForClient("/wages")).toBe(false);
    expect(isAllowedForClient("/wages/advances")).toBe(false);
    expect(isAllowedForClient("/projects")).toBe(false);
    expect(isAllowedForClient("/projects/abc/log")).toBe(false);
    expect(isAllowedForClient("/workers")).toBe(false);
    expect(isAllowedForClient("/accommodations")).toBe(false);
    expect(isAllowedForClient("/clients")).toBe(false);
  });
});

describe("isBlockedForWorker covers the new /clients admin area", () => {
  it("blocks workers from /clients", () => {
    expect(isBlockedForWorker("/clients")).toBe(true);
    expect(isBlockedForWorker("/clients/new")).toBe(true);
    expect(isBlockedForWorker("/clients/abc")).toBe(true);
  });
});

describe("isPortalPath covers /portal and /clients", () => {
  it("treats them as portal paths", () => {
    expect(isPortalPath("/portal")).toBe(true);
    expect(isPortalPath("/portal/abc")).toBe(true);
    expect(isPortalPath("/clients")).toBe(true);
    expect(isPortalPath("/clients/new")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/portal/access.test.ts`
Expected: FAIL — `isClientPath` / `isAllowedForClient` are not exported; `/clients` and `/portal` not yet recognized.

- [ ] **Step 3: Implement the predicates**

Edit `lib/portal/access.ts`:
1. Add `/portal` and `/clients` to `PORTAL_PATHS`:
```ts
export const PORTAL_PATHS = [
  "/dashboard",
  "/projects",
  "/workers",
  "/accommodations",
  "/wages",
  "/clients",
  "/portal",
  "/login",
  "/change-password",
];
```
2. Add `/clients` to the admin-only prefixes:
```ts
const ADMIN_ONLY_PREFIXES = ["/projects", "/workers", "/accommodations", "/wages", "/clients"];
```
3. Append the client predicates at the end of the file:
```ts
// Locale-stripped client-portal base. CLIENT logins may reach ONLY this area
// (and /change-password). Everything else — admin and worker paths alike — is
// blocked for clients.
const CLIENT_BASE = "/portal";

export function isClientPath(p: string): boolean {
  return p === CLIENT_BASE || p.startsWith(CLIENT_BASE + "/");
}

export function isAllowedForClient(p: string): boolean {
  return (
    isClientPath(p) ||
    p === "/change-password" ||
    p.startsWith("/change-password/")
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/portal/access.test.ts`
Expected: PASS (all describe blocks, old and new).

- [ ] **Step 5: Commit**

```bash
git add lib/portal/access.ts lib/portal/access.test.ts
git commit -m "feat(client-portal): client access predicates + tests"
```

---

## Task 4: Proxy — role-explicit allow-list gate

**Files:**
- Modify: `proxy.ts:6` (import) and `proxy.ts:87-91` (gate)

- [ ] **Step 1: Import the client predicate**

Change the access import at `proxy.ts:6` to:
```ts
import { isPortalPath, isBlockedForWorker, isAllowedForClient } from "./lib/portal/access";
```

- [ ] **Step 2: Replace the deny-by-exception gate with role-explicit branching**

Replace the block at `proxy.ts:87-91`:
```ts
  if (token.role !== "ADMIN" && isBlockedForWorker(strippedPath)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale ?? routing.defaultLocale}/dashboard`;
    return NextResponse.redirect(url);
  }
```
with:
```ts
  const loc = locale ?? routing.defaultLocale;

  if (token.role === "CLIENT") {
    // Clients may reach only the client area (+ change-password). Anything else
    // bounces to the client home — never to /dashboard (worker/admin-shaped).
    if (!isAllowedForClient(strippedPath)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${loc}/portal`;
      return NextResponse.redirect(url);
    }
  } else if (token.role === "WORKER") {
    if (isBlockedForWorker(strippedPath)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${loc}/dashboard`;
      return NextResponse.redirect(url);
    }
  }
  // ADMIN: full access, no redirect.
```

- [ ] **Step 3: Build to verify the middleware compiles**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Re-run the access test suite (the gate's logic lives there)**

Run: `npx vitest run lib/portal/access.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add proxy.ts
git commit -m "fix(client-portal): role-explicit proxy gate (clients no longer inherit worker access)"
```

---

## Task 5: `requireClient()` page guard

**Files:**
- Modify: `lib/portal/session.ts`

- [ ] **Step 1: Add the guard**

Append to `lib/portal/session.ts`:
```ts
export async function requireClient() {
  const user = await requireUser();
  if (user.role !== "CLIENT" || !user.clientId) redirect("/login");
  return { ...user, clientId: user.clientId };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (`user.clientId` is typed `string | null`; the guard narrows it to `string`).

- [ ] **Step 3: Commit**

```bash
git add lib/portal/session.ts
git commit -m "feat(client-portal): requireClient() page guard"
```

---

## Task 6: Derived timeline (pure logic, TDD)

**Files:**
- Create: `lib/portal/timeline.ts`
- Test: `lib/portal/timeline.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/portal/timeline.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeSectionTimeline, computeProjectTimeline } from "./timeline";

const d = (s: string) => new Date(s + "T00:00:00.000Z");

describe("computeSectionTimeline", () => {
  it("is NOT_STARTED when there are no logs", () => {
    const r = computeSectionTimeline({ name: "A", tables: [{ total: 4, logs: [] }] });
    expect(r.status).toBe("NOT_STARTED");
    expect(r.startedAt).toBeNull();
    expect(r.completedAt).toBeNull();
  });

  it("is IN_PROGRESS while below capacity", () => {
    const r = computeSectionTimeline({
      name: "A",
      tables: [{ total: 4, logs: [{ action: "TIE", count: 2, workDate: d("2026-05-01"), createdAt: d("2026-05-01") }] }],
    });
    expect(r.status).toBe("IN_PROGRESS");
    expect(r.startedAt).toEqual(d("2026-05-01"));
    expect(r.completedAt).toBeNull();
  });

  it("is DONE with completedAt at the log that crossed full tie+connect", () => {
    const r = computeSectionTimeline({
      name: "A",
      tables: [{
        total: 2,
        logs: [
          { action: "TIE", count: 2, workDate: d("2026-05-01"), createdAt: d("2026-05-01") },
          { action: "CONNECT", count: 2, workDate: d("2026-05-03"), createdAt: d("2026-05-03") },
        ],
      }],
    });
    expect(r.status).toBe("DONE");
    expect(r.completedAt).toEqual(d("2026-05-03"));
    expect(r.lastActivityAt).toEqual(d("2026-05-03"));
  });

  it("ignores empty (total=0) tables but still completes on the real one", () => {
    const r = computeSectionTimeline({
      name: "A",
      tables: [
        { total: 0, logs: [] },
        { total: 1, logs: [
          { action: "TIE", count: 1, workDate: d("2026-05-02"), createdAt: d("2026-05-02") },
          { action: "CONNECT", count: 1, workDate: d("2026-05-02"), createdAt: d("2026-05-02") },
        ] },
      ],
    });
    expect(r.status).toBe("DONE");
    expect(r.completedAt).toEqual(d("2026-05-02"));
  });
});

describe("computeProjectTimeline", () => {
  it("emits ordered events: started, section started/completed, closed", () => {
    const events = computeProjectTimeline({
      createdAt: d("2026-04-30"),
      status: "CLOSED",
      closedAt: d("2026-05-10"),
      sections: [{
        name: "Roof",
        tables: [{
          total: 1,
          logs: [
            { action: "TIE", count: 1, workDate: d("2026-05-01"), createdAt: d("2026-05-01") },
            { action: "CONNECT", count: 1, workDate: d("2026-05-04"), createdAt: d("2026-05-04") },
          ],
        }],
      }],
    });
    expect(events.map((e) => e.type)).toEqual([
      "PROJECT_STARTED",
      "SECTION_STARTED",
      "SECTION_COMPLETED",
      "PROJECT_CLOSED",
    ]);
    expect(events[1].sectionName).toBe("Roof");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/portal/timeline.test.ts`
Expected: FAIL — module `./timeline` not found.

- [ ] **Step 3: Implement `lib/portal/timeline.ts`**

```ts
import { isTableFinished } from "./table-status";

export type SectionTimelineStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

export interface TimelineLog {
  action: "TIE" | "CONNECT";
  count: number;
  workDate: Date;
  createdAt: Date;
}
export interface TimelineTable {
  total: number; // module capacity (rows*cols - skipped)
  logs: TimelineLog[];
}
export interface TimelineSection {
  name: string;
  tables: TimelineTable[];
}
export interface TimelineProject {
  createdAt: Date;
  status: "ACTIVE" | "CLOSED";
  closedAt: Date | null;
  sections: TimelineSection[];
}

export interface SectionTimeline {
  name: string;
  status: SectionTimelineStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  lastActivityAt: Date | null;
}

export type TimelineEventType =
  | "PROJECT_STARTED"
  | "SECTION_STARTED"
  | "SECTION_COMPLETED"
  | "PROJECT_CLOSED";

export interface TimelineEvent {
  type: TimelineEventType;
  date: Date;
  sectionName?: string;
}

// A section is finished when it has at least one real (total>0) table and every
// real table is finished. Empty tables (total=0) are ignored, never block.
function sectionFinished(totals: number[], tied: number[], connected: number[]): boolean {
  let anyReal = false;
  for (let i = 0; i < totals.length; i++) {
    if (totals[i] > 0) {
      anyReal = true;
      if (!isTableFinished({ total: totals[i], tied: tied[i], connected: connected[i] })) {
        return false;
      }
    }
  }
  return anyReal;
}

export function computeSectionTimeline(section: TimelineSection): SectionTimeline {
  const all = section.tables.flatMap((t, i) => t.logs.map((l) => ({ ...l, ti: i })));
  if (all.length === 0) {
    return { name: section.name, status: "NOT_STARTED", startedAt: null, completedAt: null, lastActivityAt: null };
  }
  all.sort((a, b) => {
    const dd = a.workDate.getTime() - b.workDate.getTime();
    return dd !== 0 ? dd : a.createdAt.getTime() - b.createdAt.getTime();
  });
  const totals = section.tables.map((t) => t.total);
  const tied = section.tables.map(() => 0);
  const connected = section.tables.map(() => 0);
  let completedAt: Date | null = null;
  let lastActivityAt = all[0].workDate;
  for (const log of all) {
    if (log.action === "TIE") tied[log.ti] += log.count;
    else connected[log.ti] += log.count;
    if (log.workDate > lastActivityAt) lastActivityAt = log.workDate;
    if (completedAt === null && sectionFinished(totals, tied, connected)) {
      completedAt = log.workDate;
    }
  }
  return {
    name: section.name,
    status: completedAt ? "DONE" : "IN_PROGRESS",
    startedAt: all[0].workDate,
    completedAt,
    lastActivityAt,
  };
}

export function computeProjectTimeline(project: TimelineProject): TimelineEvent[] {
  const events: TimelineEvent[] = [{ type: "PROJECT_STARTED", date: project.createdAt }];
  for (const s of project.sections) {
    const st = computeSectionTimeline(s);
    if (st.startedAt) events.push({ type: "SECTION_STARTED", date: st.startedAt, sectionName: s.name });
    if (st.completedAt) events.push({ type: "SECTION_COMPLETED", date: st.completedAt, sectionName: s.name });
  }
  if (project.status === "CLOSED" && project.closedAt) {
    events.push({ type: "PROJECT_CLOSED", date: project.closedAt });
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/portal/timeline.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/portal/timeline.ts lib/portal/timeline.test.ts
git commit -m "feat(client-portal): derived project timeline + tests"
```

---

## Task 7: Sanitized client data layer (TDD on the pure assembler)

**Files:**
- Create: `lib/portal/client-projects.ts`
- Test: `lib/portal/client-projects.test.ts`

The Prisma-touching readers are thin; the firewall logic lives in a pure
`assembleClientProjectDetail(...)` that we unit-test. The DTO intentionally omits
pricing, worker identity, raw logs, claims, accommodations, advances, invoices,
and `storageKey`.

- [ ] **Step 1: Write the failing test**

Create `lib/portal/client-projects.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { assembleClientProjectDetail } from "./client-projects";

const d = (s: string) => new Date(s + "T00:00:00.000Z");

describe("assembleClientProjectDetail", () => {
  it("produces a sanitized DTO with progress, sections, timeline and media", () => {
    const dto = assembleClientProjectDetail({
      project: { id: "p1", name: "Hala", location: "Nitra", status: "ACTIVE", createdAt: d("2026-05-01"), closedAt: null },
      sections: [
        { name: "Strecha", tables: [{ id: "t1", name: "T1", rows: 2, cols: 1, skipped: 0 }] },
      ],
      aggregates: new Map([["t1", { totalTied: 2, totalConnected: 1 }]]),
      logRows: [
        { tableId: "t1", action: "TIE", count: 2, workDate: d("2026-05-02"), createdAt: d("2026-05-02") },
        { tableId: "t1", action: "CONNECT", count: 1, workDate: d("2026-05-03"), createdAt: d("2026-05-03") },
      ],
      photos: [{ id: "ph1", caption: "Pohlad", takenAt: d("2026-05-02"), signedUrl: "https://signed/ph1" }],
      documents: [{ id: "doc1", title: "Zmluva", mimeType: "application/pdf", sizeBytes: 1234 }],
    });

    expect(dto.id).toBe("p1");
    expect(dto.sections[0].tables[0]).toEqual({ name: "T1", total: 2, tied: 2, connected: 1, finished: false });
    expect(dto.sections[0].progressPercent).toBe(75); // (2+1)/(2*2) = 75%
    expect(dto.progressPercent).toBe(75);
    expect(dto.timeline[0].type).toBe("PROJECT_STARTED");
    expect(dto.photos[0]).toEqual({ id: "ph1", caption: "Pohlad", takenAt: "2026-05-02", signedUrl: "https://signed/ph1" });
    expect(dto.documents[0]).toEqual({ id: "doc1", title: "Zmluva", mimeType: "application/pdf", sizeBytes: 1234 });
    // firewall: no leaked fields anywhere in the serialized DTO
    const json = JSON.stringify(dto);
    for (const banned of ["price", "wage", "storageKey", "projectWorker", "advance"]) {
      expect(json.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/portal/client-projects.test.ts`
Expected: FAIL — module not found / `assembleClientProjectDetail` undefined.

- [ ] **Step 3: Implement `lib/portal/client-projects.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { computeModules } from "./modules";
import { toPercent } from "./progress";
import { isTableFinished } from "./table-status";
import { getTableAggregates, type TableAggregate } from "./activity-aggregates";
import { computeProjectTimeline, type TimelineLog } from "./timeline";
// Storage is imported dynamically inside getClientProject (see below) so this
// module — and its pure-assembler unit test — does not require the storage deps
// to be installed when this task runs.

// ---------- DTOs (the only shapes that may reach a client component) ----------
export interface ClientProjectSummary {
  id: string;
  name: string;
  location: string | null;
  status: "ACTIVE" | "CLOSED";
  progressPercent: number;
  lastActivityAt: string | null;
}
export interface ClientTable {
  name: string;
  total: number;
  tied: number;
  connected: number;
  finished: boolean;
}
export interface ClientSection {
  name: string;
  progressPercent: number;
  tables: ClientTable[];
}
export interface ClientPhoto {
  id: string;
  caption: string | null;
  takenAt: string | null;
  signedUrl: string;
}
export interface ClientDocument {
  id: string;
  title: string;
  mimeType: string | null;
  sizeBytes: number | null;
}
export interface ClientTimelineEvent {
  type: "PROJECT_STARTED" | "SECTION_STARTED" | "SECTION_COMPLETED" | "PROJECT_CLOSED";
  date: string;
  sectionName?: string;
}
export interface ClientProjectDetail {
  id: string;
  name: string;
  location: string | null;
  status: "ACTIVE" | "CLOSED";
  progressPercent: number;
  sections: ClientSection[];
  timeline: ClientTimelineEvent[];
  photos: ClientPhoto[];
  documents: ClientDocument[];
}

function isoDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

// ---------- Pure assembler (unit-tested; no prisma/storage access) ----------
export interface AssembleInput {
  project: { id: string; name: string; location: string | null; status: "ACTIVE" | "CLOSED"; createdAt: Date; closedAt: Date | null };
  sections: { name: string; tables: { id: string; name: string; rows: number; cols: number; skipped: number }[] }[];
  aggregates: Map<string, TableAggregate>;
  logRows: { tableId: string; action: "TIE" | "CONNECT"; count: number; workDate: Date; createdAt: Date }[];
  photos: { id: string; caption: string | null; takenAt: Date | null; signedUrl: string }[];
  documents: { id: string; title: string; mimeType: string | null; sizeBytes: number | null }[];
}

export function assembleClientProjectDetail(input: AssembleInput): ClientProjectDetail {
  const logsByTable = new Map<string, TimelineLog[]>();
  for (const r of input.logRows) {
    const arr = logsByTable.get(r.tableId) ?? [];
    arr.push({ action: r.action, count: r.count, workDate: r.workDate, createdAt: r.createdAt });
    logsByTable.set(r.tableId, arr);
  }

  let projTotal = 0;
  let projTied = 0;
  let projConnected = 0;

  const sections: ClientSection[] = input.sections.map((s) => {
    let secTotal = 0;
    let secTied = 0;
    let secConnected = 0;
    const tables: ClientTable[] = s.tables.map((t) => {
      const total = computeModules({ rows: t.rows, cols: t.cols, skipped: t.skipped });
      const agg = input.aggregates.get(t.id) ?? { totalTied: 0, totalConnected: 0 };
      secTotal += total;
      secTied += agg.totalTied;
      secConnected += agg.totalConnected;
      return {
        name: t.name,
        total,
        tied: agg.totalTied,
        connected: agg.totalConnected,
        finished: isTableFinished({ total, tied: agg.totalTied, connected: agg.totalConnected }),
      };
    });
    projTotal += secTotal;
    projTied += secTied;
    projConnected += secConnected;
    return {
      name: s.name,
      progressPercent: toPercent(secTied + secConnected, secTotal * 2),
      tables,
    };
  });

  const timeline = computeProjectTimeline({
    createdAt: input.project.createdAt,
    status: input.project.status,
    closedAt: input.project.closedAt,
    sections: input.sections.map((s) => ({
      name: s.name,
      tables: s.tables.map((t) => ({
        total: computeModules({ rows: t.rows, cols: t.cols, skipped: t.skipped }),
        logs: logsByTable.get(t.id) ?? [],
      })),
    })),
  }).map((e) => ({ type: e.type, date: isoDate(e.date)!, sectionName: e.sectionName }));

  return {
    id: input.project.id,
    name: input.project.name,
    location: input.project.location,
    status: input.project.status,
    progressPercent: toPercent(projTied + projConnected, projTotal * 2),
    sections,
    timeline,
    photos: input.photos.map((p) => ({ id: p.id, caption: p.caption, takenAt: isoDate(p.takenAt), signedUrl: p.signedUrl })),
    documents: input.documents.map((d) => ({ id: d.id, title: d.title, mimeType: d.mimeType, sizeBytes: d.sizeBytes })),
  };
}

// ---------- Prisma readers (always scoped by clientId) ----------
export async function listClientProjects(clientId: string): Promise<ClientProjectSummary[]> {
  const projects = await prisma.project.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { sections: { include: { tables: true } } },
  });
  const tableIds = projects.flatMap((p) => p.sections.flatMap((s) => s.tables.map((t) => t.id)));
  const aggregates = await getTableAggregates(tableIds);

  const maxByTable = tableIds.length
    ? await prisma.activityLog.groupBy({ by: ["tableId"], where: { tableId: { in: tableIds } }, _max: { workDate: true } })
    : [];
  const lastByTable = new Map(maxByTable.map((r) => [r.tableId, r._max.workDate ?? null]));

  return projects.map((p) => {
    let total = 0;
    let tied = 0;
    let connected = 0;
    let last: Date | null = null;
    for (const s of p.sections) {
      for (const t of s.tables) {
        total += computeModules({ rows: t.rows, cols: t.cols, skipped: t.skipped });
        const agg = aggregates.get(t.id);
        tied += agg?.totalTied ?? 0;
        connected += agg?.totalConnected ?? 0;
        const lt = lastByTable.get(t.id) ?? null;
        if (lt && (!last || lt > last)) last = lt;
      }
    }
    return {
      id: p.id,
      name: p.name,
      location: p.location,
      status: p.status,
      progressPercent: toPercent(tied + connected, total * 2),
      lastActivityAt: last ? last.toISOString() : null,
    };
  });
}

export async function getClientProject(clientId: string, projectId: string): Promise<ClientProjectDetail | null> {
  // Ownership is enforced in the query: a project not owned by this client returns null.
  const project = await prisma.project.findFirst({
    where: { id: projectId, clientId },
    include: {
      sections: { orderBy: { orderIndex: "asc" }, include: { tables: { orderBy: { orderIndex: "asc" } } } },
      photos: { orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }] },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return null;

  const tableIds = project.sections.flatMap((s) => s.tables.map((t) => t.id));
  const [aggregates, logRows] = await Promise.all([
    getTableAggregates(tableIds),
    tableIds.length
      ? prisma.activityLog.findMany({
          where: { tableId: { in: tableIds } },
          select: { tableId: true, action: true, count: true, workDate: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const { createSignedUrl } = await import("@/lib/storage");
  const signedPhotos = await Promise.all(
    project.photos.map(async (ph) => ({
      id: ph.id,
      caption: ph.caption,
      takenAt: ph.takenAt,
      signedUrl: await createSignedUrl(ph.storageKey),
    })),
  );

  return assembleClientProjectDetail({
    project: {
      id: project.id,
      name: project.name,
      location: project.location,
      status: project.status,
      createdAt: project.createdAt,
      closedAt: project.closedAt,
    },
    sections: project.sections.map((s) => ({
      name: s.name,
      tables: s.tables.map((t) => ({ id: t.id, name: t.name, rows: t.rows, cols: t.cols, skipped: t.skipped })),
    })),
    aggregates,
    logRows: logRows as AssembleInput["logRows"],
    photos: signedPhotos,
    documents: project.documents.map((d) => ({ id: d.id, title: d.title, mimeType: d.mimeType, sizeBytes: d.sizeBytes })),
  });
}
```

> Note: `getClientProject` loads `@/lib/storage` (Task 8) via a runtime dynamic `import()`, so this module pulls no storage deps at load time — the pure `assembleClientProjectDetail` test in Step 4 runs without `@supabase/supabase-js` installed. `getClientProject` is only invoked by the pages in Tasks 9–10, by which point Task 8 is complete.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/portal/client-projects.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/portal/client-projects.ts lib/portal/client-projects.test.ts
git commit -m "feat(client-portal): sanitized client data layer + firewall test"
```

---

## Task 8: Supabase Storage helper

**Files:**
- Modify: `package.json` (add `@supabase/supabase-js`)
- Create: `lib/storage.ts`
- Modify: `.env` / `.env.local` (document new vars)

- [ ] **Step 1: Install the storage client**

Run: `npm install @supabase/supabase-js`
Expected: package added to `dependencies`.

- [ ] **Step 2: Add env vars**

Add to `.env` (and `.env.local` for dev; values from the Supabase project / local stack):
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_PROJECT_FILES_BUCKET=project-files
```
(Service-role key is server-only — never expose with a `NEXT_PUBLIC_` prefix.)

- [ ] **Step 3: Create the private bucket**

Run against the dev DB (psql or Supabase Studio SQL editor):
```sql
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;
```
Expected: one row inserted (or no-op if it already exists). Because all access goes through the service-role key server-side, no per-row storage RLS policy is required; ownership is enforced in our server actions.

- [ ] **Step 4: Implement `lib/storage.ts`**

```ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const PROJECT_FILES_BUCKET = process.env.SUPABASE_PROJECT_FILES_BUCKET ?? "project-files";

let cached: ReturnType<typeof createClient> | null = null;
function client() {
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for storage operations");
  }
  if (!cached) {
    cached = createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  return cached;
}

export async function uploadProjectFile(key: string, body: ArrayBuffer | Buffer, contentType: string): Promise<void> {
  const { error } = await client().storage.from(PROJECT_FILES_BUCKET).upload(key, body, { contentType, upsert: false });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
}

export async function createSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await client().storage.from(PROJECT_FILES_BUCKET).createSignedUrl(key, expiresInSeconds);
  if (error || !data) throw new Error(`storage signing failed: ${error?.message ?? "unknown"}`);
  return data.signedUrl;
}

export async function deleteProjectFile(key: string): Promise<void> {
  const { error } = await client().storage.from(PROJECT_FILES_BUCKET).remove([key]);
  if (error) throw new Error(`storage delete failed: ${error.message}`);
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/storage.ts .env
git commit -m "feat(client-portal): Supabase Storage helper (private bucket, signed URLs)"
```

---

## Task 9: Client shell layout + dashboard

**Files:**
- Create: `app/[locale]/(client)/layout.tsx`
- Create: `components/client/ClientTopBar.tsx`
- Create: `components/client/ProjectSwitcher.tsx`
- Create: `app/[locale]/(client)/portal/page.tsx`

- [ ] **Step 1: Client layout (own chrome, mustChangePassword enforced)**

Create `app/[locale]/(client)/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { requireClient } from "@/lib/portal/session";
import { prisma } from "@/lib/prisma";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { LangSync } from "@/components/portal/LangSync";
import { signOut } from "@/auth";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();

  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mustChangePassword: true, name: true },
  });
  if (!fresh) redirect("/login");
  if (fresh.mustChangePassword) redirect("/change-password");

  const messages = await getMessages();
  const locale = await getLocale();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <LangSync locale={locale} />
      <div className="min-h-screen bg-bg">
        <ClientTopBar name={fresh.name} signOutAction={doSignOut} />
        <main className="mx-auto max-w-5xl p-6 md:p-10">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 2: Client top bar**

Create `components/client/ClientTopBar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PortalLanguageSwitcher } from "@/components/portal/PortalLanguageSwitcher";

export function ClientTopBar({ name, signOutAction }: { name: string; signOutAction: () => Promise<void> }) {
  const t = useTranslations("clientPortal");
  const tNav = useTranslations("nav");
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border-soft bg-surface px-4 py-3 md:px-8">
      <Link href="/portal" className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-6 w-6 rounded-sm"
          style={{ background: "linear-gradient(135deg, var(--color-navy) 0 50%, var(--color-accent) 50% 100%)" }}
        />
        <span className="font-semibold tracking-[0.2em] text-navy text-sm">{t("title")}</span>
      </Link>
      <div className="flex items-center gap-3 md:gap-4">
        <span className="hidden sm:inline text-sm font-medium text-navy">{name}</span>
        <PortalLanguageSwitcher />
        <form action={signOutAction}>
          <button type="submit" className="whitespace-nowrap text-sm text-slate-ink hover:text-navy">
            {tNav("signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Dashboard page**

Create `app/[locale]/(client)/portal/page.tsx`:
```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/portal/session";
import { listClientProjects } from "@/lib/portal/client-projects";
import { Card } from "@/components/ui/Card";

export default async function ClientDashboardPage() {
  const { clientId } = await requireClient();
  const t = await getTranslations("clientPortal");
  const projects = await listClientProjects(clientId);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-navy">{t("myProjects")}</h1>
      {projects.length === 0 && <p className="text-sm text-muted">{t("noProjects")}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/portal/${p.id}`}>
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy">{p.name}</h2>
                <span className="text-xs text-muted">
                  {p.status === "ACTIVE" ? t("statusActive") : t("statusClosed")}
                </span>
              </div>
              {p.location && <p className="text-sm text-muted">{p.location}</p>}
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                  <div className="h-full bg-navy" style={{ width: `${p.progressPercent}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-ink">{p.progressPercent}% · {t("complete")}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build to verify the route group compiles and renders**

Run: `npx tsc --noEmit`
Expected: PASS. (Full `next build` is run in Task 15.)

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(client)/layout.tsx" "app/[locale]/(client)/portal/page.tsx" components/client/ClientTopBar.tsx
git commit -m "feat(client-portal): client shell layout + dashboard"
```

---

## Task 10: Client project detail (tabs: Progress / Timeline / Gallery / Documents)

**Files:**
- Create: `app/[locale]/(client)/portal/[projectId]/page.tsx`
- Create: `components/client/ClientProjectTabs.tsx`
- Create: `components/client/ClientSectionTables.tsx`
- Create: `components/client/ClientTimeline.tsx`
- Create: `components/client/ClientGallery.tsx`
- Create: `components/client/ClientDocuments.tsx`
- Create: `lib/actions/client-files.ts`

- [ ] **Step 1: Client document-download action (signed URL, ownership-checked)**

Create `lib/actions/client-files.ts`:
```ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/portal/session";
import { createSignedUrl } from "@/lib/storage";

export type ClientFileResult = { ok: true; url: string } | { ok: false };

export async function getClientDocumentUrlAction(documentId: string): Promise<ClientFileResult> {
  const { clientId } = await requireClient();
  const doc = await prisma.projectDocument.findFirst({
    where: { id: documentId, project: { clientId } },
    select: { storageKey: true },
  });
  if (!doc) return { ok: false };
  return { ok: true, url: await createSignedUrl(doc.storageKey) };
}
```

- [ ] **Step 2: Read-only section/table view**

Create `components/client/ClientSectionTables.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import type { ClientSection } from "@/lib/portal/client-projects";

export function ClientSectionTables({ sections }: { sections: ClientSection[] }) {
  const t = useTranslations("clientPortal");
  return (
    <div className="space-y-6">
      {sections.map((s, i) => (
        <div key={i} className="rounded-lg border border-border-soft bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-navy">{s.name}</h3>
            <span className="text-xs text-slate-ink">{s.progressPercent}%</span>
          </div>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-bg">
            <div className="h-full bg-navy" style={{ width: `${s.progressPercent}%` }} />
          </div>
          <ul className="space-y-1 text-sm">
            {s.tables.map((tb, j) => (
              <li key={j} className="flex items-center justify-between">
                <span className="text-slate-ink">{tb.name}</span>
                <span className={tb.finished ? "text-green-700" : "text-muted"}>
                  {tb.finished ? t("finished") : `${Math.min(tb.tied, tb.connected)} / ${tb.total} ${t("modules")}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Timeline view**

Create `components/client/ClientTimeline.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import type { ClientTimelineEvent } from "@/lib/portal/client-projects";

export function ClientTimeline({ events }: { events: ClientTimelineEvent[] }) {
  const t = useTranslations("clientPortal");
  function label(e: ClientTimelineEvent): string {
    switch (e.type) {
      case "PROJECT_STARTED": return t("evtProjectStarted");
      case "PROJECT_CLOSED": return t("evtProjectClosed");
      case "SECTION_STARTED": return t("evtSectionStarted", { section: e.sectionName ?? "" });
      case "SECTION_COMPLETED": return t("evtSectionCompleted", { section: e.sectionName ?? "" });
    }
  }
  if (events.length === 0) return <p className="text-sm text-muted">{t("noTimeline")}</p>;
  return (
    <ol className="relative border-l border-border-soft pl-6">
      {events.map((e, i) => (
        <li key={i} className="mb-6">
          <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-navy" aria-hidden />
          <time className="block text-xs text-muted">{e.date}</time>
          <p className="text-sm text-slate-ink">{label(e)}</p>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: Gallery view**

Create `components/client/ClientGallery.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import type { ClientPhoto } from "@/lib/portal/client-projects";

export function ClientGallery({ photos }: { photos: ClientPhoto[] }) {
  const t = useTranslations("clientPortal");
  if (photos.length === 0) return <p className="text-sm text-muted">{t("noPhotos")}</p>;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {photos.map((p) => (
        <figure key={p.id} className="overflow-hidden rounded-lg border border-border-soft bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.signedUrl} alt={p.caption ?? ""} className="h-40 w-full object-cover" loading="lazy" />
          {p.caption && <figcaption className="p-2 text-xs text-slate-ink">{p.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Documents view (download via signed URL on click)**

Create `components/client/ClientDocuments.tsx`:
```tsx
"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ClientDocument } from "@/lib/portal/client-projects";
import { getClientDocumentUrlAction } from "@/lib/actions/client-files";

export function ClientDocuments({ documents }: { documents: ClientDocument[] }) {
  const t = useTranslations("clientPortal");
  const [pending, start] = useTransition();
  if (documents.length === 0) return <p className="text-sm text-muted">{t("noDocuments")}</p>;

  function open(id: string) {
    start(async () => {
      const r = await getClientDocumentUrlAction(id);
      if (r.ok) window.open(r.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <ul className="divide-y divide-border-soft rounded-lg border border-border-soft bg-surface">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-navy">{d.title}</span>
          <button
            onClick={() => open(d.id)}
            disabled={pending}
            className="text-sm text-navy underline disabled:opacity-50"
          >
            {t("download")}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: Tabs wrapper**

Create `components/client/ClientProjectTabs.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ClientProjectDetail } from "@/lib/portal/client-projects";
import { ClientSectionTables } from "./ClientSectionTables";
import { ClientTimeline } from "./ClientTimeline";
import { ClientGallery } from "./ClientGallery";
import { ClientDocuments } from "./ClientDocuments";

type Tab = "progress" | "timeline" | "gallery" | "documents";

export function ClientProjectTabs({ project }: { project: ClientProjectDetail }) {
  const t = useTranslations("clientPortal");
  const [tab, setTab] = useState<Tab>("progress");
  const tabs: { id: Tab; label: string }[] = [
    { id: "progress", label: t("tabProgress") },
    { id: "timeline", label: t("tabTimeline") },
    { id: "gallery", label: t("tabGallery") },
    { id: "documents", label: t("tabDocuments") },
  ];
  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-border-soft">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-4 py-2 text-sm ${tab === tb.id ? "border-b-2 border-navy font-medium text-navy" : "text-slate-ink hover:text-navy"}`}
          >
            {tb.label}
          </button>
        ))}
      </div>
      {tab === "progress" && <ClientSectionTables sections={project.sections} />}
      {tab === "timeline" && <ClientTimeline events={project.timeline} />}
      {tab === "gallery" && <ClientGallery photos={project.photos} />}
      {tab === "documents" && <ClientDocuments documents={project.documents} />}
    </div>
  );
}
```

- [ ] **Step 7: Detail page**

Create `app/[locale]/(client)/portal/[projectId]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/portal/session";
import { getClientProject } from "@/lib/portal/client-projects";
import { ClientProjectTabs } from "@/components/client/ClientProjectTabs";

export default async function ClientProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { clientId } = await requireClient();
  const { projectId } = await params;
  const t = await getTranslations("clientPortal");

  const project = await getClientProject(clientId, projectId);
  if (!project) notFound();

  return (
    <div>
      <Link href="/portal" className="text-sm text-navy underline">← {t("backToProjects")}</Link>
      <div className="mb-6 mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{project.name}</h1>
          {project.location && <p className="text-sm text-muted">{project.location}</p>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-navy">{project.progressPercent}%</div>
          <div className="text-xs text-muted">{t("complete")}</div>
        </div>
      </div>
      <ClientProjectTabs project={project} />
    </div>
  );
}
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add "app/[locale]/(client)/portal/[projectId]/page.tsx" components/client/ lib/actions/client-files.ts
git commit -m "feat(client-portal): project detail with progress/timeline/gallery/documents tabs"
```

---

## Task 11: Admin client actions (TDD on validation)

**Files:**
- Create: `lib/actions/clients.ts`
- Test: `lib/actions/clients.test.ts`

- [ ] **Step 1: Write the failing validation test**

Create `lib/actions/clients.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseCreateClient } from "./clients";

describe("parseCreateClient", () => {
  it("accepts a valid client+login payload", () => {
    const r = parseCreateClient({
      name: "Acme s.r.o.", company: "Acme", email: "a@acme.test",
      username: "acme", password: "supersecret",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a short password and a bad username", () => {
    const r = parseCreateClient({ name: "X", company: "", email: "", username: "A B", password: "short" });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/actions/clients.test.ts`
Expected: FAIL — `parseCreateClient` not exported.

- [ ] **Step 3: Implement `lib/actions/clients.ts`**

```ts
"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export type ActionError = { ok: false; error: string; fieldErrors?: Record<string, string> };
export type ActionOk<T = unknown> = { ok: true; data?: T };
export type ActionResult<T = unknown> = ActionOk<T> | ActionError;

function zErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const createClientSchema = z.object({
  name: z.string().trim().min(1),
  company: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)),
  username: z.string().trim().toLowerCase().regex(USERNAME_RE, "3-30 chars: lowercase letters, digits, dot, underscore, hyphen"),
  password: z.string().min(8),
});

// Exported pure parser so validation can be unit-tested without a DB.
export function parseCreateClient(input: unknown) {
  return createClientSchema.safeParse(input);
}

export async function createClientAction(fd: FormData): Promise<ActionResult<{ clientId: string }>> {
  await requireAdmin();
  const parsed = parseCreateClient({
    name: fd.get("name"),
    company: fd.get("company"),
    email: fd.get("email"),
    username: fd.get("username"),
    password: fd.get("password"),
  });
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: zErrors(parsed.error.issues) };

  const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (existing) return { ok: false, error: "validation", fieldErrors: { username: "Username already in use" } };
  if (parsed.data.email) {
    const e = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (e) return { ok: false, error: "validation", fieldErrors: { email: "Email already in use" } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      company: parsed.data.company ?? null,
      email: parsed.data.email ?? null,
      users: {
        create: {
          username: parsed.data.username,
          email: parsed.data.email ?? null,
          name: parsed.data.name,
          role: "CLIENT",
          language: "SK",
          passwordHash,
          mustChangePassword: true,
        },
      },
    },
  });
  revalidatePath("/clients");
  return { ok: true, data: { clientId: client.id } };
}

const updateClientSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().trim().min(1),
  company: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)),
  active: z.coerce.boolean(),
});

export async function updateClientAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateClientSchema.safeParse({
    clientId: fd.get("clientId"),
    name: fd.get("name"),
    company: fd.get("company"),
    email: fd.get("email"),
    active: fd.get("active") === "on" || fd.get("active") === "true",
  });
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: zErrors(parsed.error.issues) };
  await prisma.client.update({
    where: { id: parsed.data.clientId },
    data: {
      name: parsed.data.name,
      company: parsed.data.company ?? null,
      email: parsed.data.email ?? null,
      active: parsed.data.active,
    },
  });
  // Mirror active state onto the client's login accounts.
  await prisma.user.updateMany({ where: { clientId: parsed.data.clientId }, data: { active: parsed.data.active } });
  revalidatePath("/clients");
  revalidatePath(`/clients/${parsed.data.clientId}`);
  return { ok: true };
}

export async function assignProjectToClientAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const clientId = String(fd.get("clientId") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  if (!clientId || !projectId) return { ok: false, error: "validation" };
  await prisma.project.update({ where: { id: projectId }, data: { clientId } });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

export async function unassignProjectAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  if (!projectId) return { ok: false, error: "validation" };
  const project = await prisma.project.update({ where: { id: projectId }, data: { clientId: null } });
  revalidatePath(`/projects/${projectId}/edit`);
  if (project) revalidatePath(`/clients`);
  return { ok: true };
}

export async function resetClientPasswordAction(fd: FormData): Promise<ActionResult<{ tempPassword: string }>> {
  await requireAdmin();
  const clientId = String(fd.get("clientId") ?? "");
  if (!clientId) return { ok: false, error: "validation" };
  const login = await prisma.user.findFirst({ where: { clientId }, orderBy: { createdAt: "asc" } });
  if (!login) return { ok: false, error: "no-login" };
  const tempPassword = `qs-${randomBytes(8).toString("hex")}`;
  await prisma.user.update({
    where: { id: login.id },
    data: { passwordHash: await bcrypt.hash(tempPassword, 10), mustChangePassword: true },
  });
  revalidatePath(`/clients/${clientId}`);
  return { ok: true, data: { tempPassword } };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/actions/clients.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/clients.ts lib/actions/clients.test.ts
git commit -m "feat(client-portal): admin client actions (create login, update, assign, reset)"
```

---

## Task 12: Admin clients pages

**Files:**
- Create: `app/[locale]/(portal)/clients/page.tsx`
- Create: `app/[locale]/(portal)/clients/new/page.tsx`
- Create: `app/[locale]/(portal)/clients/[clientId]/page.tsx`
- Create: `app/[locale]/(portal)/clients/[clientId]/EditClientForm.tsx`

- [ ] **Step 1: Clients list**

Create `app/[locale]/(portal)/clients/page.tsx`:
```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";

export default async function ClientsListPage() {
  await requireAdmin();
  const t = await getTranslations("clients");
  const tCommon = await getTranslations("common");
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">{t("list")}</h1>
        <Button href="/clients/new" variant="primary">{t("new")}</Button>
      </div>
      <DataTable
        headers={[tCommon("name"), t("company"), tCommon("email"), t("projectsCount"), tCommon("status"), tCommon("actions")]}
        rows={clients.map((c) => [
          c.name,
          c.company ?? <span className="text-muted">—</span>,
          c.email ?? <span className="text-muted">—</span>,
          String(c._count.projects),
          c.active ? tCommon("active") : tCommon("closed"),
          <Link key={c.id} href={`/clients/${c.id}`} className="text-navy underline">{tCommon("edit")}</Link>,
        ])}
      />
    </div>
  );
}
```

- [ ] **Step 2: New client page**

Create `app/[locale]/(portal)/clients/new/page.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { createClientAction } from "@/lib/actions/clients";

export default function NewClientPage() {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await createClientAction(fd);
      if (r.ok) router.push("/clients");
      else setErrors(r.fieldErrors ?? {});
    });
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-8 text-2xl font-semibold text-navy">{t("new")}</h1>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField label={tCommon("name")} name="name" required error={errors.name} />
        <FormField label={t("company")} name="company" error={errors.company} />
        <FormField label={tCommon("email")} name="email" type="email" error={errors.email} />
        <hr className="border-border-soft" />
        <p className="text-xs text-muted">{t("loginHint")}</p>
        <FormField label={tCommon("username")} name="username" required error={errors.username} />
        <FormField label={tCommon("password")} name="password" type="password" required hint="Min 8 characters" error={errors.password} />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? tCommon("loading") : tCommon("create")}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Edit client page (server) + assignment data**

Create `app/[locale]/(portal)/clients/[clientId]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { EditClientForm } from "./EditClientForm";

export default async function EditClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  await requireAdmin();
  const { clientId } = await params;
  const t = await getTranslations("clients");

  const [client, assignedProjects, unassignedProjects] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.project.findMany({ where: { clientId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { clientId: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!client) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-8 text-2xl font-semibold text-navy">{client.name}</h1>
      <EditClientForm
        client={{ id: client.id, name: client.name, company: client.company, email: client.email, active: client.active }}
        assigned={assignedProjects}
        available={unassignedProjects}
        labels={{
          name: t("nameLabel"), company: t("company"), email: t("emailLabel"), active: t("active"),
          save: t("save"), resetPassword: t("resetPassword"), projects: t("projects"),
          assign: t("assignProject"), unassign: t("unassign"), tempPassword: t("tempPassword"),
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Edit client form (client component)**

Create `app/[locale]/(portal)/clients/[clientId]/EditClientForm.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  updateClientAction,
  assignProjectToClientAction,
  unassignProjectAction,
  resetClientPasswordAction,
} from "@/lib/actions/clients";

type Project = { id: string; name: string };

export function EditClientForm({
  client,
  assigned,
  available,
  labels,
}: {
  client: { id: string; name: string; company: string | null; email: string | null; active: boolean };
  assigned: Project[];
  available: Project[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [temp, setTemp] = useState<string | null>(null);
  const [select, setSelect] = useState("");

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("clientId", client.id);
    start(async () => {
      await updateClientAction(fd);
      router.refresh();
    });
  }

  function assign() {
    if (!select) return;
    const fd = new FormData();
    fd.set("clientId", client.id);
    fd.set("projectId", select);
    start(async () => {
      await assignProjectToClientAction(fd);
      setSelect("");
      router.refresh();
    });
  }

  function unassign(projectId: string) {
    const fd = new FormData();
    fd.set("projectId", projectId);
    start(async () => {
      await unassignProjectAction(fd);
      router.refresh();
    });
  }

  function reset() {
    const fd = new FormData();
    fd.set("clientId", client.id);
    start(async () => {
      const r = await resetClientPasswordAction(fd);
      if (r.ok && r.data) setTemp(r.data.tempPassword);
    });
  }

  return (
    <div className="space-y-10">
      <form onSubmit={save} className="space-y-4">
        <label className="block text-sm">
          <span className="text-slate-ink">{labels.name}</span>
          <input name="name" defaultValue={client.name} className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-ink">{labels.company}</span>
          <input name="company" defaultValue={client.company ?? ""} className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-ink">{labels.email}</span>
          <input name="email" type="email" defaultValue={client.email ?? ""} className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="active" type="checkbox" defaultChecked={client.active} />
          <span className="text-slate-ink">{labels.active}</span>
        </label>
        <Button type="submit" variant="primary" disabled={pending}>{labels.save}</Button>
      </form>

      <div className="space-y-2">
        <Button onClick={reset} variant="secondary" disabled={pending}>{labels.resetPassword}</Button>
        {temp && (
          <p className="text-sm">
            {labels.tempPassword}: <code className="rounded bg-bg px-2 py-1 font-mono text-xs">{temp}</code>
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy">{labels.projects}</h2>
        <ul className="mb-3 divide-y divide-border-soft rounded-md border border-border-soft bg-surface">
          {assigned.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-navy">{p.name}</span>
              <button onClick={() => unassign(p.id)} disabled={pending} className="text-xs text-red-600 hover:underline">
                {labels.unassign}
              </button>
            </li>
          ))}
        </ul>
        {available.length > 0 && (
          <div className="flex items-end gap-2">
            <select value={select} onChange={(e) => setSelect(e.target.value)} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm">
              <option value="">— {labels.assign} —</option>
              {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Button onClick={assign} variant="primary" disabled={pending || !select}>{labels.assign}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(portal)/clients"
git commit -m "feat(client-portal): admin clients list/new/edit + project assignment"
```

---

## Task 13: Admin per-project media + client panels

**Files:**
- Create: `lib/actions/project-files.ts`
- Create: `app/[locale]/(portal)/projects/[projectId]/edit/ClientPanel.tsx`
- Create: `app/[locale]/(portal)/projects/[projectId]/edit/PhotosPanel.tsx`
- Create: `app/[locale]/(portal)/projects/[projectId]/edit/DocumentsPanel.tsx`
- Modify: `app/[locale]/(portal)/projects/[projectId]/edit/page.tsx`

- [ ] **Step 1: Project-files server actions**

Create `lib/actions/project-files.ts`:
```ts
"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { uploadProjectFile, deleteProjectFile } from "@/lib/storage";

export type ActionResult = { ok: true } | { ok: false; error: string };

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

export async function uploadPhotoAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const caption = String(fd.get("caption") ?? "").trim() || null;
  const file = fd.get("file");
  if (!projectId || !(file instanceof File) || file.size === 0) return { ok: false, error: "validation" };

  const key = `projects/${projectId}/photos/${randomUUID()}-${safeName(file.name)}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await uploadProjectFile(key, buf, file.type || "application/octet-stream");
  await prisma.projectPhoto.create({ data: { projectId, storageKey: key, caption } });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

export async function deletePhotoAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(fd.get("photoId") ?? "");
  if (!id) return { ok: false, error: "validation" };
  const photo = await prisma.projectPhoto.findUnique({ where: { id } });
  if (!photo) return { ok: false, error: "not-found" };
  await deleteProjectFile(photo.storageKey).catch(() => {});
  await prisma.projectPhoto.delete({ where: { id } });
  revalidatePath(`/projects/${photo.projectId}/edit`);
  return { ok: true };
}

export async function uploadDocumentAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const title = String(fd.get("title") ?? "").trim();
  const file = fd.get("file");
  if (!projectId || !title || !(file instanceof File) || file.size === 0) return { ok: false, error: "validation" };

  const key = `projects/${projectId}/documents/${randomUUID()}-${safeName(file.name)}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await uploadProjectFile(key, buf, file.type || "application/octet-stream");
  await prisma.projectDocument.create({
    data: { projectId, storageKey: key, title, mimeType: file.type || null, sizeBytes: file.size },
  });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

export async function deleteDocumentAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(fd.get("documentId") ?? "");
  if (!id) return { ok: false, error: "validation" };
  const doc = await prisma.projectDocument.findUnique({ where: { id } });
  if (!doc) return { ok: false, error: "not-found" };
  await deleteProjectFile(doc.storageKey).catch(() => {});
  await prisma.projectDocument.delete({ where: { id } });
  revalidatePath(`/projects/${doc.projectId}/edit`);
  return { ok: true };
}
```

- [ ] **Step 2: ClientPanel (assign/clear the project's client)**

Create `app/[locale]/(portal)/projects/[projectId]/edit/ClientPanel.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { assignProjectToClientAction, unassignProjectAction } from "@/lib/actions/clients";

type Client = { id: string; name: string };

export function ClientPanel({
  projectId,
  current,
  clients,
  labels,
}: {
  projectId: string;
  current: Client | null;
  clients: Client[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [select, setSelect] = useState("");

  function assign() {
    if (!select) return;
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("clientId", select);
    start(async () => {
      await assignProjectToClientAction(fd);
      router.refresh();
    });
  }
  function clear() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    start(async () => {
      await unassignProjectAction(fd);
      router.refresh();
    });
  }

  if (current) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border-soft bg-surface px-4 py-3 text-sm">
        <span className="text-navy">{current.name}</span>
        <button onClick={clear} disabled={pending} className="text-xs text-red-600 hover:underline">{labels.clear}</button>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <select value={select} onChange={(e) => setSelect(e.target.value)} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm">
        <option value="">— {labels.assign} —</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <Button onClick={assign} variant="primary" disabled={pending || !select}>{labels.assign}</Button>
    </div>
  );
}
```

- [ ] **Step 3: PhotosPanel**

Create `app/[locale]/(portal)/projects/[projectId]/edit/PhotosPanel.tsx`:
```tsx
"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { uploadPhotoAction, deletePhotoAction } from "@/lib/actions/project-files";

type Photo = { id: string; caption: string | null };

export function PhotosPanel({ projectId, photos, labels }: { projectId: string; photos: Photo[]; labels: Record<string, string> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("projectId", projectId);
    start(async () => {
      const r = await uploadPhotoAction(fd);
      if (r.ok) formRef.current?.reset();
      router.refresh();
    });
  }
  function remove(photoId: string) {
    const fd = new FormData();
    fd.set("photoId", photoId);
    start(async () => {
      await deletePhotoAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} onSubmit={upload} className="flex flex-wrap items-end gap-2">
        <input type="file" name="file" accept="image/*" required className="text-sm" />
        <input type="text" name="caption" placeholder={labels.caption} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        <Button type="submit" variant="primary" disabled={pending}>{labels.upload}</Button>
      </form>
      <ul className="divide-y divide-border-soft rounded-md border border-border-soft bg-surface">
        {photos.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-slate-ink">{p.caption ?? p.id}</span>
            <button onClick={() => remove(p.id)} disabled={pending} className="text-xs text-red-600 hover:underline">{labels.delete}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: DocumentsPanel**

Create `app/[locale]/(portal)/projects/[projectId]/edit/DocumentsPanel.tsx`:
```tsx
"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { uploadDocumentAction, deleteDocumentAction } from "@/lib/actions/project-files";

type Doc = { id: string; title: string };

export function DocumentsPanel({ projectId, documents, labels }: { projectId: string; documents: Doc[]; labels: Record<string, string> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("projectId", projectId);
    start(async () => {
      const r = await uploadDocumentAction(fd);
      if (r.ok) formRef.current?.reset();
      router.refresh();
    });
  }
  function remove(documentId: string) {
    const fd = new FormData();
    fd.set("documentId", documentId);
    start(async () => {
      await deleteDocumentAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} onSubmit={upload} className="flex flex-wrap items-end gap-2">
        <input type="text" name="title" placeholder={labels.title} required className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        <input type="file" name="file" required className="text-sm" />
        <Button type="submit" variant="primary" disabled={pending}>{labels.upload}</Button>
      </form>
      <ul className="divide-y divide-border-soft rounded-md border border-border-soft bg-surface">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-navy">{d.title}</span>
            <button onClick={() => remove(d.id)} disabled={pending} className="text-xs text-red-600 hover:underline">{labels.delete}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Mount the panels on the project editor**

In `app/[locale]/(portal)/projects/[projectId]/edit/page.tsx`:

1. Add imports after the existing component imports (after `WorkersPanel`):
```ts
import { ClientPanel } from "./ClientPanel";
import { PhotosPanel } from "./PhotosPanel";
import { DocumentsPanel } from "./DocumentsPanel";
```
2. Extend the data fetch. Change the `prisma.project.findUnique` include to also load client + media, and fetch the assignable clients. Replace the `Promise.all([...])` block (lines 17-26) with:
```ts
  const [project, allWorkers, allClients] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: { orderBy: { orderIndex: "asc" }, include: { tables: { orderBy: { orderIndex: "asc" } } } },
        projectWorkers: { include: { user: true } },
        client: { select: { id: true, name: true } },
        photos: { orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }], select: { id: true, caption: true } },
        documents: { orderBy: { createdAt: "desc" }, select: { id: true, title: true } },
      },
    }),
    prisma.user.findMany({ where: { active: true, role: { not: "CLIENT" } }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
```
(Note the added `role: { not: "CLIENT" }` filter so client logins never appear in the worker-assignment dropdown.)

3. After the `WorkersPanel` block (before the closing `</div>` at the end of the returned JSX), add:
```tsx
      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-navy">{t("client")}</h2>
        <ClientPanel
          projectId={project.id}
          current={project.client}
          clients={allClients}
          labels={{ assign: t("assignClient"), clear: t("clearClient") }}
        />
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-navy">{t("photos")}</h2>
        <PhotosPanel
          projectId={project.id}
          photos={project.photos}
          labels={{ upload: t("upload"), caption: t("caption"), delete: t("deleteLabel") }}
        />
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-navy">{t("documents")}</h2>
        <DocumentsPanel
          projectId={project.id}
          documents={project.documents}
          labels={{ upload: t("upload"), title: t("docTitle"), delete: t("deleteLabel") }}
        />
      </div>
```
These use the existing `t = getTranslations("portalProjects")`; the new keys are added in Task 14.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/actions/project-files.ts "app/[locale]/(portal)/projects/[projectId]/edit"
git commit -m "feat(client-portal): admin project media panels + client assignment on editor"
```

---

## Task 14: i18n + nav wiring (all 5 locales)

**Files:**
- Modify: `lib/portal-nav.ts`
- Modify: `components/portal/Sidebar.tsx`, `components/portal/TopBar.tsx`, `components/portal/MobileNav.tsx`
- Modify: `messages/sk.json`, `messages/en.json`, `messages/de.json`, `messages/fr.json`, `messages/sv.json`

- [ ] **Step 1: Add the `clients` nav item + widen the role union**

Replace `lib/portal-nav.ts` with:
```ts
export type PortalNavItem = {
  href: string;
  labelKey:
    | "dashboard"
    | "projects"
    | "workers"
    | "accommodations"
    | "wages"
    | "clients"
    | "applications"
    | "inquiries";
};

/**
 * Portal navigation destinations. `labelKey` is a key in the `nav`
 * next-intl namespace — each consumer resolves it with its own `t`.
 * CLIENT logins use the separate (client) layout, so they get no items here.
 */
export function getPortalNavItems(role: "ADMIN" | "WORKER" | "CLIENT"): PortalNavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/dashboard", labelKey: "dashboard" },
      { href: "/projects", labelKey: "projects" },
      { href: "/workers", labelKey: "workers" },
      { href: "/clients", labelKey: "clients" },
      { href: "/accommodations", labelKey: "accommodations" },
      { href: "/wages", labelKey: "wages" },
      { href: "/applications", labelKey: "applications" },
      { href: "/inquiries", labelKey: "inquiries" },
    ];
  }
  if (role === "WORKER") {
    return [
      { href: "/dashboard", labelKey: "dashboard" },
      { href: "/wages", labelKey: "wages" },
    ];
  }
  return [];
}
```

- [ ] **Step 2: Widen the role prop in the three portal chrome components**

In `components/portal/Sidebar.tsx`, `components/portal/TopBar.tsx`, and `components/portal/MobileNav.tsx`, change every `role: "ADMIN" | "WORKER"` prop type to `role: "ADMIN" | "WORKER" | "CLIENT"`. (No logic changes — clients never render these, but the widened `session.user.role` must type-check where the portal layout passes it.)

- [ ] **Step 3: Add `nav.clients` to all 5 locales**

In each `messages/<locale>.json`, add a `"clients"` key inside the `"nav"` object:
- `sk.json`: `"clients": "Klienti",`
- `en.json`: `"clients": "Clients",`
- `de.json`: `"clients": "Kunden",`
- `fr.json`: `"clients": "Clients",`
- `sv.json`: `"clients": "Kunder",`

- [ ] **Step 4: Add the `clients` admin namespace to all 5 locales**

Add this top-level namespace to each file (translated values shown per locale):

`sk.json`:
```json
"clients": {
  "list": "Klienti", "new": "Nový klient", "company": "Firma",
  "projectsCount": "Stavby", "loginHint": "Prihlasovacie konto klienta (pri prvom prihlásení si zmení heslo).",
  "nameLabel": "Meno", "emailLabel": "E-mail", "active": "Aktívny", "save": "Uložiť",
  "resetPassword": "Resetovať heslo", "tempPassword": "Dočasné heslo",
  "projects": "Priradené stavby", "assignProject": "Priradiť stavbu", "unassign": "Odobrať"
}
```
`en.json`:
```json
"clients": {
  "list": "Clients", "new": "New client", "company": "Company",
  "projectsCount": "Projects", "loginHint": "Client login account (changes password on first sign-in).",
  "nameLabel": "Name", "emailLabel": "Email", "active": "Active", "save": "Save",
  "resetPassword": "Reset password", "tempPassword": "Temporary password",
  "projects": "Assigned projects", "assignProject": "Assign project", "unassign": "Remove"
}
```
`de.json`:
```json
"clients": {
  "list": "Kunden", "new": "Neuer Kunde", "company": "Firma",
  "projectsCount": "Projekte", "loginHint": "Kunden-Login (Passwortänderung bei erster Anmeldung).",
  "nameLabel": "Name", "emailLabel": "E-Mail", "active": "Aktiv", "save": "Speichern",
  "resetPassword": "Passwort zurücksetzen", "tempPassword": "Temporäres Passwort",
  "projects": "Zugewiesene Projekte", "assignProject": "Projekt zuweisen", "unassign": "Entfernen"
}
```
`fr.json`:
```json
"clients": {
  "list": "Clients", "new": "Nouveau client", "company": "Société",
  "projectsCount": "Chantiers", "loginHint": "Compte client (changement de mot de passe à la première connexion).",
  "nameLabel": "Nom", "emailLabel": "E-mail", "active": "Actif", "save": "Enregistrer",
  "resetPassword": "Réinitialiser le mot de passe", "tempPassword": "Mot de passe temporaire",
  "projects": "Chantiers attribués", "assignProject": "Attribuer un chantier", "unassign": "Retirer"
}
```
`sv.json`:
```json
"clients": {
  "list": "Kunder", "new": "Ny kund", "company": "Företag",
  "projectsCount": "Projekt", "loginHint": "Kundinloggning (byter lösenord vid första inloggningen).",
  "nameLabel": "Namn", "emailLabel": "E-post", "active": "Aktiv", "save": "Spara",
  "resetPassword": "Återställ lösenord", "tempPassword": "Tillfälligt lösenord",
  "projects": "Tilldelade projekt", "assignProject": "Tilldela projekt", "unassign": "Ta bort"
}
```

- [ ] **Step 5: Add the `clientPortal` namespace to all 5 locales**

`sk.json`:
```json
"clientPortal": {
  "title": "PORTÁL", "myProjects": "Moje stavby", "noProjects": "Zatiaľ nemáte žiadne stavby.",
  "complete": "dokončené", "statusActive": "Prebieha", "statusClosed": "Ukončené",
  "backToProjects": "Späť na stavby", "tabProgress": "Postup", "tabTimeline": "Časová os",
  "tabGallery": "Galéria", "tabDocuments": "Dokumenty", "finished": "Hotové", "modules": "modulov",
  "noTimeline": "Zatiaľ žiadne udalosti.", "noPhotos": "Zatiaľ žiadne fotky.", "noDocuments": "Zatiaľ žiadne dokumenty.",
  "download": "Stiahnuť",
  "evtProjectStarted": "Stavba začatá", "evtProjectClosed": "Stavba ukončená",
  "evtSectionStarted": "Sekcia začatá: {section}", "evtSectionCompleted": "Sekcia dokončená: {section}"
}
```
`en.json`:
```json
"clientPortal": {
  "title": "PORTAL", "myProjects": "My projects", "noProjects": "You have no projects yet.",
  "complete": "complete", "statusActive": "In progress", "statusClosed": "Completed",
  "backToProjects": "Back to projects", "tabProgress": "Progress", "tabTimeline": "Timeline",
  "tabGallery": "Gallery", "tabDocuments": "Documents", "finished": "Finished", "modules": "modules",
  "noTimeline": "No events yet.", "noPhotos": "No photos yet.", "noDocuments": "No documents yet.",
  "download": "Download",
  "evtProjectStarted": "Project started", "evtProjectClosed": "Project completed",
  "evtSectionStarted": "Section started: {section}", "evtSectionCompleted": "Section completed: {section}"
}
```
`de.json`:
```json
"clientPortal": {
  "title": "PORTAL", "myProjects": "Meine Projekte", "noProjects": "Sie haben noch keine Projekte.",
  "complete": "abgeschlossen", "statusActive": "In Bearbeitung", "statusClosed": "Abgeschlossen",
  "backToProjects": "Zurück zu den Projekten", "tabProgress": "Fortschritt", "tabTimeline": "Zeitachse",
  "tabGallery": "Galerie", "tabDocuments": "Dokumente", "finished": "Fertig", "modules": "Module",
  "noTimeline": "Noch keine Ereignisse.", "noPhotos": "Noch keine Fotos.", "noDocuments": "Noch keine Dokumente.",
  "download": "Herunterladen",
  "evtProjectStarted": "Projekt gestartet", "evtProjectClosed": "Projekt abgeschlossen",
  "evtSectionStarted": "Abschnitt gestartet: {section}", "evtSectionCompleted": "Abschnitt abgeschlossen: {section}"
}
```
`fr.json`:
```json
"clientPortal": {
  "title": "PORTAIL", "myProjects": "Mes chantiers", "noProjects": "Vous n'avez encore aucun chantier.",
  "complete": "terminé", "statusActive": "En cours", "statusClosed": "Terminé",
  "backToProjects": "Retour aux chantiers", "tabProgress": "Avancement", "tabTimeline": "Chronologie",
  "tabGallery": "Galerie", "tabDocuments": "Documents", "finished": "Terminé", "modules": "modules",
  "noTimeline": "Aucun événement pour le moment.", "noPhotos": "Aucune photo pour le moment.", "noDocuments": "Aucun document pour le moment.",
  "download": "Télécharger",
  "evtProjectStarted": "Chantier démarré", "evtProjectClosed": "Chantier terminé",
  "evtSectionStarted": "Section démarrée : {section}", "evtSectionCompleted": "Section terminée : {section}"
}
```
`sv.json`:
```json
"clientPortal": {
  "title": "PORTAL", "myProjects": "Mina projekt", "noProjects": "Du har inga projekt ännu.",
  "complete": "klart", "statusActive": "Pågår", "statusClosed": "Avslutat",
  "backToProjects": "Tillbaka till projekt", "tabProgress": "Förlopp", "tabTimeline": "Tidslinje",
  "tabGallery": "Galleri", "tabDocuments": "Dokument", "finished": "Klar", "modules": "moduler",
  "noTimeline": "Inga händelser ännu.", "noPhotos": "Inga foton ännu.", "noDocuments": "Inga dokument ännu.",
  "download": "Ladda ner",
  "evtProjectStarted": "Projekt startat", "evtProjectClosed": "Projekt avslutat",
  "evtSectionStarted": "Sektion startad: {section}", "evtSectionCompleted": "Sektion avslutad: {section}"
}
```

- [ ] **Step 6: Add the new `portalProjects` keys used by the editor panels (all 5 locales)**

Inside the existing `"portalProjects"` namespace in each file, add:
- `sk.json`: `"client": "Klient", "assignClient": "Priradiť klienta", "clearClient": "Odobrať", "photos": "Fotky", "documents": "Dokumenty", "upload": "Nahrať", "caption": "Popis", "docTitle": "Názov dokumentu", "deleteLabel": "Zmazať"`
- `en.json`: `"client": "Client", "assignClient": "Assign client", "clearClient": "Remove", "photos": "Photos", "documents": "Documents", "upload": "Upload", "caption": "Caption", "docTitle": "Document title", "deleteLabel": "Delete"`
- `de.json`: `"client": "Kunde", "assignClient": "Kunde zuweisen", "clearClient": "Entfernen", "photos": "Fotos", "documents": "Dokumente", "upload": "Hochladen", "caption": "Bildtext", "docTitle": "Dokumenttitel", "deleteLabel": "Löschen"`
- `fr.json`: `"client": "Client", "assignClient": "Attribuer un client", "clearClient": "Retirer", "photos": "Photos", "documents": "Documents", "upload": "Téléverser", "caption": "Légende", "docTitle": "Titre du document", "deleteLabel": "Supprimer"`
- `sv.json`: `"client": "Kund", "assignClient": "Tilldela kund", "clearClient": "Ta bort", "photos": "Foton", "documents": "Dokument", "upload": "Ladda upp", "caption": "Bildtext", "docTitle": "Dokumenttitel", "deleteLabel": "Radera"`

- [ ] **Step 7: Verify JSON is valid and types compile**

Run: `node -e "for (const l of ['sk','en','de','fr','sv']) JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8')); console.log('json ok')"`
Expected: prints `json ok`.
Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/portal-nav.ts components/portal/Sidebar.tsx components/portal/TopBar.tsx components/portal/MobileNav.tsx messages
git commit -m "feat(client-portal): nav + i18n (clientPortal/clients namespaces, 5 locales)"
```

---

## Task 15: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: PASS — including `timeline.test.ts`, `client-projects.test.ts`, `access.test.ts`, `clients.test.ts`, and all pre-existing tests.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors (warnings acceptable if pre-existing).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds; the `(client)` route group and `/clients` admin routes appear in the route manifest.

- [ ] **Step 4: Manual smoke test (dev)**

Start dev (`npm run dev`) and verify, using the shared dev DB (do not reset it):
1. As ADMIN: `/clients` → New client (creates login). Assign a project to the client.
2. On `/projects/<id>/edit`: upload a photo and a document; confirm they list.
3. Sign out; sign in as the client login → forced to `/change-password`; set a new password.
4. Land on `/portal`: see only the assigned project; open it; check Progress/Timeline/Gallery/Documents tabs; download a document.
5. **Firewall checks:** as the client, manually visit `/dashboard`, `/wages`, `/projects`, `/workers`, `/clients` → each redirects to `/portal`. Visit `/portal/<other-clients-project-id>` → 404 (not found).
6. Confirm no worker names, prices, wages, or amounts appear anywhere in the client UI.

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "test(client-portal): verification pass"
```

---

## Self-review notes

- **Spec coverage:** auth/role (T2), proxy fix (T4), access predicates (T3), `requireClient` (T5), Client/FK/media schema (T1), sanitized data layer + firewall (T7), derived timeline (T6), storage (T8), client dashboard/detail/tabs (T9–T10), admin clients + assignment (T11–T12), admin media panels (T13), i18n/nav (T14), verification incl. firewall + cross-client checks (T15). All spec sections map to a task.
- **Firewall:** client DTOs are built only in `lib/portal/client-projects.ts`; `storageKey` never enters a DTO; documents download via an ownership-checked action; cross-client access returns null/404 (query-level `clientId`).
- **Type consistency:** `ClientProjectDetail` / `ClientSection` / `ClientPhoto` / `ClientDocument` are defined once in T7 and imported by T9–T10 components. `getPortalNavItems` role union widened in T14 matches the widened `session.user.role` from T2 and the chrome props.
