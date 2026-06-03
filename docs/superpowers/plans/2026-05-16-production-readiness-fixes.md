# Production Readiness Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical, important, and minor issues identified in the production readiness code review so the app can be safely deployed.

**Architecture:** Fixes are grouped by severity. Critical fixes are independent of each other and can be done in any order. The activityLogs fix (Task 2) touches `ProjectLogView`, 3 page files, and the dashboard — all related. All other tasks touch isolated files.

**Tech Stack:** Next.js 15, TypeScript, Prisma ORM, NextAuth, Zod, nodemailer (to be installed), bcryptjs, Docker Compose

---

## Task 1: Restore middleware.ts (Critical)

> ⚠️ **DO NOT EXECUTE THIS TASK — IT IS WRONG AND WILL CRASH THE MACHINE.**
>
> This task assumes Next.js 15. The project actually runs **Next.js 16.2.6**,
> where the `middleware.ts` convention was replaced by `proxy.ts`. `proxy.ts`
> already exists and is the correct file. Restoring `middleware.ts` alongside it
> produces a fatal `Both middleware file and proxy file are detected` error that
> throws the dev server into a worker-respawn storm — it spawns hundreds of
> processes, exhausts system RAM, and hard-freezes the PC. **This already
> happened once** (see `dev.log`: 514 out-of-memory crashes).
>
> `middleware.ts` was correctly removed in commit `e5bd068`. **Leave it removed
> and skip this entire task.** Superseded — verified 2026-05-16.

**Files:**
- Restore: `middleware.ts` (deleted in working tree, exists at HEAD)

- [ ] **Step 1: Restore the deleted file from git**

```bash
git restore middleware.ts
```

- [ ] **Step 2: Verify it exists and is correct**

```bash
cat middleware.ts
```

Expected: file content showing NextAuth-wrapped middleware with `isPublic` path checks and admin-only route guards.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "fix: restore accidentally deleted middleware.ts"
```

---

## Task 2: Fix unbounded activityLogs query (Critical)

The current code loads ALL activityLogs for every table in every project on the dashboard, overview page, and log page. At scale this is an unbounded DB read and memory allocation. The fix: refactor ProjectLogView to accept precomputed totals + filtered my-logs, and update all three callers to use a groupBy aggregate for totals.

**Files:**
- Modify: `components/portal/ProjectLogView.tsx`
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `app/(app)/projects/[projectId]/page.tsx`
- Modify: `app/(app)/projects/[projectId]/log/page.tsx`

- [ ] **Step 1: Update ProjectLogView Table type and component logic**

In `components/portal/ProjectLogView.tsx`, replace the `Table` type and the tied/connected/hasMyActivity/myLogs computations:

```typescript
// Replace the existing Table type (around line 5)
type ActivityLog = {
  id: string;
  projectWorkerId: string;
  action: "TIE" | "CONNECT";
  count: number;
  workDate: Date;
  createdAt: Date;
};

type Claim = {
  id: string;
  projectWorkerId: string;
  projectWorker: { userId: string; user: { name: string } };
};

// NEW Table type — no raw activityLogs, use precomputed values instead
type Table = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  skipped: number;
  totalTied: number;
  totalConnected: number;
  myLogs: ActivityLog[];
  hasMyActivity: boolean;
  claims: Claim[];
};
```

Then inside the component, replace lines 70–116 (the `.map((tbl) => {` block opening):

```typescript
{s.tables.map((tbl) => {
  const total = computeModules({
    rows: tbl.rows,
    cols: tbl.cols,
    skipped: tbl.skipped,
  });
  const tied = tbl.totalTied;
  const connected = tbl.totalConnected;

  const myClaim = projectWorkerId
    ? tbl.claims.find((c) => c.projectWorkerId === projectWorkerId) ?? null
    : null;
  const hasMyActivity = tbl.hasMyActivity;

  const claimedUserIds = new Set(tbl.claims.map((c) => c.projectWorker.userId));
  const assignedUserIds = new Set(assignedWorkers.map((w) => w.userId));
  const selectableWorkers = allActiveWorkers
    .filter((u) => !claimedUserIds.has(u.id))
    .map((u) => ({
      userId: u.id,
      name: u.name,
      inProject: assignedUserIds.has(u.id),
    }));

  return (
    <TableLogger
      key={tbl.id}
      table={{ id: tbl.id, name: tbl.name, total, tied, connected }}
      myLogs={tbl.myLogs.map((l) => ({
        id: l.id,
        action: l.action,
        count: l.count,
        workDate: l.workDate.toISOString().slice(0, 10),
        createdAt: l.createdAt.toISOString(),
      }))}
```

- [ ] **Step 2: Add shared helper for building activityLog aggregates**

Create `lib/portal/activity-aggregates.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export type TableAggregate = {
  totalTied: number;
  totalConnected: number;
};

export async function getTableAggregates(
  tableIds: string[],
): Promise<Map<string, TableAggregate>> {
  if (tableIds.length === 0) return new Map();

  const rows = await prisma.activityLog.groupBy({
    by: ["tableId", "action"],
    where: { tableId: { in: tableIds } },
    _sum: { count: true },
  });

  const map = new Map<string, TableAggregate>();
  for (const row of rows) {
    if (!map.has(row.tableId)) map.set(row.tableId, { totalTied: 0, totalConnected: 0 });
    const entry = map.get(row.tableId)!;
    if (row.action === "TIE") entry.totalTied = row._sum.count ?? 0;
    else entry.totalConnected = row._sum.count ?? 0;
  }
  return map;
}

export async function getMyLogs(
  tableIds: string[],
  projectWorkerIds: string[],
): Promise<Map<string, { logs: Array<{ id: string; projectWorkerId: string; action: "TIE" | "CONNECT"; count: number; workDate: Date; createdAt: Date }>; hasActivity: boolean }>> {
  if (tableIds.length === 0 || projectWorkerIds.length === 0) return new Map();

  const logs = await prisma.activityLog.findMany({
    where: {
      tableId: { in: tableIds },
      projectWorkerId: { in: projectWorkerIds },
    },
    orderBy: { createdAt: "desc" },
    take: tableIds.length * 10, // bounded: up to 10 per table across all pws
  });

  const map = new Map<string, { logs: typeof logs; hasActivity: boolean }>();
  for (const tableId of tableIds) {
    const tableLogs = logs.filter((l) => l.tableId === tableId).slice(0, 5);
    map.set(tableId, { logs: tableLogs, hasActivity: tableLogs.length > 0 });
  }
  return map;
}
```

- [ ] **Step 3: Update dashboard/page.tsx**

Replace the full dashboard page content with a version that:
1. Removes `activityLogs` from the nested include
2. Calls the new aggregate helpers
3. Builds `sections` with precomputed fields

Full updated `app/(app)/dashboard/page.tsx`:

```typescript
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { Card } from "@/components/ui/Card";
import { ProjectLogView } from "@/components/portal/ProjectLogView";
import { computeModules } from "@/lib/portal/modules";
import { getTableAggregates, getMyLogs } from "@/lib/portal/activity-aggregates";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  const [myProjectWorkers, allActiveWorkers] = await Promise.all([
    prisma.projectWorker.findMany({
      where: { userId: user.id, project: { status: "ACTIVE" } },
      include: {
        project: {
          include: {
            sections: {
              orderBy: { orderIndex: "asc" },
              include: {
                tables: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    claims: {
                      include: { projectWorker: { include: { user: true } } },
                    },
                  },
                },
              },
            },
            projectWorkers: {
              include: { user: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: { project: { createdAt: "desc" } },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Collect all table IDs and pw IDs for aggregate queries
  const allTableIds = myProjectWorkers.flatMap((pw) =>
    pw.project.sections.flatMap((s) => s.tables.map((t) => t.id)),
  );
  const myPwIds = myProjectWorkers.map((pw) => pw.id);

  const [aggregates, myLogsMap] = await Promise.all([
    getTableAggregates(allTableIds),
    getMyLogs(allTableIds, myPwIds),
  ]);

  const assignedIds = new Set(myProjectWorkers.map((pw) => pw.projectId));
  const otherProjects =
    user.role === "ADMIN"
      ? await prisma.project.findMany({
          where: { status: "ACTIVE", id: { notIn: [...assignedIds] } },
          orderBy: { createdAt: "desc" },
        })
      : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("dashboard")}</h1>

      {myProjectWorkers.length === 0 && user.role !== "ADMIN" && (
        <p className="text-sm text-muted">No active projects assigned to you.</p>
      )}

      {myProjectWorkers.map(({ id: pwId, project }) => {
        let totalModules = 0;
        let tied = 0;
        let connected = 0;
        for (const s of project.sections) {
          for (const tbl of s.tables) {
            totalModules += computeModules({
              rows: tbl.rows,
              cols: tbl.cols,
              skipped: tbl.skipped,
            });
            const agg = aggregates.get(tbl.id);
            tied += agg?.totalTied ?? 0;
            connected += agg?.totalConnected ?? 0;
          }
        }

        const sections = project.sections.map((s) => ({
          ...s,
          tables: s.tables.map((tbl) => {
            const agg = aggregates.get(tbl.id) ?? { totalTied: 0, totalConnected: 0 };
            const logEntry = myLogsMap.get(tbl.id) ?? { logs: [], hasActivity: false };
            return {
              ...tbl,
              totalTied: agg.totalTied,
              totalConnected: agg.totalConnected,
              myLogs: logEntry.logs,
              hasMyActivity: logEntry.hasActivity,
            };
          }),
        }));

        return (
          <details
            key={project.id}
            open
            className="mb-8 group rounded-lg border border-border-soft bg-surface"
          >
            <summary className="cursor-pointer list-none flex items-center justify-between p-5 border-b border-border-soft group-open:border-border-soft">
              <div>
                <h2 className="text-lg font-semibold text-navy">{project.name}</h2>
                {project.location && (
                  <p className="text-xs text-muted mt-0.5">{project.location}</p>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-ink">
                <span>
                  <span className="font-semibold text-navy">{tied}</span>/{totalModules} tied
                </span>
                <span>
                  <span className="font-semibold text-navy">{connected}</span>/{totalModules} connected
                </span>
                {user.role === "ADMIN" && (
                  <Link
                    href={`/projects/${project.id}/edit`}
                    className="text-navy underline"
                  >
                    {tCommon("edit")}
                  </Link>
                )}
                <span className="text-muted text-lg leading-none transition-transform group-open:rotate-180">⌄</span>
              </div>
            </summary>
            <div className="p-5">
              <ProjectLogView
                project={{
                  id: project.id,
                  name: project.name,
                  location: project.location,
                  status: project.status,
                  sections,
                }}
                assignedWorkers={project.projectWorkers.map((p) => ({
                  id: p.id,
                  userId: p.userId,
                  name: p.user.name,
                }))}
                allActiveWorkers={allActiveWorkers}
                projectWorkerId={pwId}
                isAdmin={user.role === "ADMIN"}
              />
            </div>
          </details>
        );
      })}

      {user.role === "ADMIN" && otherProjects.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/60 mb-4">
            Other active projects
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherProjects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card>
                  <h3 className="text-lg font-semibold text-navy">{p.name}</h3>
                  {p.location && (
                    <p className="text-sm text-muted">{p.location}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-ink">View →</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update projects/[projectId]/page.tsx**

Replace the activityLogs include with aggregates (same pattern):

```typescript
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { ProjectLogView } from "@/components/portal/ProjectLogView";
import { getTableAggregates, getMyLogs } from "@/lib/portal/activity-aggregates";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const tCommon = await getTranslations("common");

  const [project, allActiveWorkers] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            tables: {
              orderBy: { orderIndex: "asc" },
              include: {
                claims: { include: { projectWorker: { include: { user: true } } } },
              },
            },
          },
        },
        projectWorkers: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!project) notFound();

  const myPw = project.projectWorkers.find((p) => p.userId === user.id) ?? null;
  if (user.role !== "ADMIN" && !myPw) notFound();

  const tableIds = project.sections.flatMap((s) => s.tables.map((t) => t.id));
  const myPwIds = myPw ? [myPw.id] : [];

  const [aggregates, myLogsMap] = await Promise.all([
    getTableAggregates(tableIds),
    getMyLogs(tableIds, myPwIds),
  ]);

  const sections = project.sections.map((s) => ({
    ...s,
    tables: s.tables.map((tbl) => {
      const agg = aggregates.get(tbl.id) ?? { totalTied: 0, totalConnected: 0 };
      const logEntry = myLogsMap.get(tbl.id) ?? { logs: [], hasActivity: false };
      return {
        ...tbl,
        totalTied: agg.totalTied,
        totalConnected: agg.totalConnected,
        myLogs: logEntry.logs,
        hasMyActivity: logEntry.hasActivity,
      };
    }),
  }));
```

Then pass `sections` (not `project.sections`) to ProjectLogView:
```typescript
  return (
    // ... (keep existing JSX but change project.sections → sections in the ProjectLogView prop)
```

- [ ] **Step 5: Update projects/[projectId]/log/page.tsx**

Same pattern as Step 4. Replace the activityLogs include and add the aggregate helpers:

```typescript
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { ProjectLogView } from "@/components/portal/ProjectLogView";
import { getTableAggregates, getMyLogs } from "@/lib/portal/activity-aggregates";

export default async function LogPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const t = await getTranslations("log");

  const [project, allActiveWorkers] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            tables: {
              orderBy: { orderIndex: "asc" },
              include: {
                claims: { include: { projectWorker: { include: { user: true } } } },
              },
            },
          },
        },
        projectWorkers: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!project) notFound();
  const myPw = project.projectWorkers.find((p) => p.userId === user.id) ?? null;
  if (user.role !== "ADMIN" && !myPw) notFound();

  const tableIds = project.sections.flatMap((s) => s.tables.map((t) => t.id));
  const myPwIds = myPw ? [myPw.id] : [];

  const [aggregates, myLogsMap] = await Promise.all([
    getTableAggregates(tableIds),
    getMyLogs(tableIds, myPwIds),
  ]);

  const sections = project.sections.map((s) => ({
    ...s,
    tables: s.tables.map((tbl) => {
      const agg = aggregates.get(tbl.id) ?? { totalTied: 0, totalConnected: 0 };
      const logEntry = myLogsMap.get(tbl.id) ?? { logs: [], hasActivity: false };
      return {
        ...tbl,
        totalTied: agg.totalTied,
        totalConnected: agg.totalConnected,
        myLogs: logEntry.logs,
        hasMyActivity: logEntry.hasActivity,
      };
    }),
  }));

  const projectWorkerId = myPw?.id ?? null;

  return (
    // ... keep existing JSX but use sections instead of project.sections in ProjectLogView
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors related to activityLogs or ProjectLogView Table type.

- [ ] **Step 7: Commit**

```bash
git add components/portal/ProjectLogView.tsx lib/portal/activity-aggregates.ts app/\(app\)/dashboard/page.tsx "app/(app)/projects/[projectId]/page.tsx" "app/(app)/projects/[projectId]/log/page.tsx"
git commit -m "fix: replace unbounded activityLogs loads with bounded aggregate queries"
```

---

## Task 3: Fix Math.random() for temp passwords (Critical)

**Files:**
- Modify: `lib/actions/workers.ts:130`

- [ ] **Step 1: Replace Math.random() with crypto.randomBytes**

In `lib/actions/workers.ts`, find line 130:
```typescript
const tempPassword = `qs-${Math.random().toString(36).slice(2, 10)}`;
```

Replace with:
```typescript
import { randomBytes } from "crypto";
// ...
const tempPassword = `qs-${randomBytes(8).toString("hex")}`;
```

The full import block at the top of `lib/actions/workers.ts` should become:
```typescript
"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Role, Locale } from "@prisma/client";
```

And line 130 becomes:
```typescript
const tempPassword = `qs-${randomBytes(8).toString("hex")}`;
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep workers.ts
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add lib/actions/workers.ts
git commit -m "fix: use crypto.randomBytes for temp password generation"
```

---

## Task 4: Add date filtering to wages/accommodation queries (Critical)

Both the wages page and the export route load ALL accommodations regardless of date range.

**Files:**
- Modify: `app/(app)/wages/page.tsx:29-31`
- Modify: `app/(app)/wages/export.csv/route.ts:27`

- [ ] **Step 1: Fix wages page.tsx**

In `app/(app)/wages/page.tsx`, change the accommodation query from:
```typescript
prisma.accommodation.findMany({
  include: { workers: true },
}),
```

To:
```typescript
prisma.accommodation.findMany({
  where: {
    startDate: { lte: to },
    endDate: { gte: from },
  },
  include: { workers: true },
}),
```

- [ ] **Step 2: Fix wages export route**

In `app/(app)/wages/export.csv/route.ts`, change the accommodation query from:
```typescript
prisma.accommodation.findMany({ include: { workers: true } }),
```

To:
```typescript
prisma.accommodation.findMany({
  where: {
    startDate: { lte: to },
    endDate: { gte: from },
  },
  include: { workers: true },
}),
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "wages"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/wages/page.tsx" "app/(app)/wages/export.csv/route.ts"
git commit -m "fix: push date range filter to DB for accommodation queries"
```

---

## Task 5: Validate login redirect 'from' param (Important)

The `from` query param on `/login` is used directly in `router.push()` without checking it starts with `/`, allowing off-domain redirects.

**Files:**
- Modify: `app/login/page.tsx:28`

- [ ] **Step 1: Fix the redirect**

In `app/login/page.tsx`, find line 28:
```typescript
router.push(params.get("from") ?? "/dashboard");
```

Replace with:
```typescript
const from = params.get("from");
router.push(from?.startsWith("/") ? from : "/dashboard");
```

- [ ] **Step 2: Commit**

```bash
git add app/login/page.tsx
git commit -m "fix: validate login redirect 'from' param starts with /"
```

---

## Task 6: Add rate limiting to the contact form API (Important)

The `/api/contact` endpoint has no rate limiting. Add a simple in-memory per-IP limiter (max 5 requests per 10 minutes).

**Files:**
- Create: `lib/rate-limit.ts`
- Modify: `app/api/contact/route.ts`

- [ ] **Step 1: Create rate limiter utility**

Create `lib/rate-limit.ts`:

```typescript
type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count++;
  return true;
}
```

- [ ] **Step 2: Apply rate limiting in contact route**

In `app/api/contact/route.ts`, add the import and rate limit check:

```typescript
import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/contact-schema";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  await prisma.contactSubmission.create({
    data: {
      company: parsed.data.company,
      name: parsed.data.name,
      email: parsed.data.email,
      projectType: parsed.data.projectType,
      sizeMW: parsed.data.sizeMW,
      country: parsed.data.country,
      startDate: parsed.data.startDate,
      scope: parsed.data.scope,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/rate-limit.ts app/api/contact/route.ts
git commit -m "fix: add in-memory rate limiting to contact form API (5 req/10min per IP)"
```

---

## Task 7: Add email notification for contact form submissions (Important)

Contact form submissions are saved to the DB but no email is sent to the business owner. Install nodemailer and send a notification email on each valid submission.

**Files:**
- Modify: `package.json` (add nodemailer)
- Create: `lib/mailer.ts`
- Modify: `app/api/contact/route.ts`

- [ ] **Step 1: Install nodemailer**

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

- [ ] **Step 2: Create mailer utility**

Create `lib/mailer.ts`:

```typescript
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendContactNotification(data: {
  company: string;
  name: string;
  email: string;
  projectType: string;
  sizeMW?: number | null;
  country: string;
  startDate?: string | null;
  scope: string;
  notes?: string | null;
}) {
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  if (!to || !process.env.SMTP_HOST) return; // skip if email not configured

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: `New contact enquiry — ${data.company}`,
    text: [
      `Company: ${data.company}`,
      `Contact: ${data.name} <${data.email}>`,
      `Project type: ${data.projectType}`,
      data.sizeMW != null ? `Size: ${data.sizeMW} MW` : null,
      `Country: ${data.country}`,
      data.startDate ? `Start: ${data.startDate}` : null,
      `Scope: ${data.scope}`,
      data.notes ? `Notes: ${data.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}
```

- [ ] **Step 3: Add send call in contact route**

In `app/api/contact/route.ts`, after the `prisma.contactSubmission.create()` call, add:

```typescript
import { sendContactNotification } from "@/lib/mailer";

// ... inside POST handler, after prisma.contactSubmission.create():
await sendContactNotification(parsed.data).catch((err) => {
  console.error("Contact email notification failed:", err);
});
```

The `.catch()` ensures email failure doesn't break the API response.

- [ ] **Step 4: Document required env vars**

Add to `.env.local.example` (create if it doesn't exist):

```
# Email notifications for contact form (optional — skip to disable)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@quantumsphere.eu
SMTP_PASS=your-smtp-password
SMTP_FROM="Quantum Sphere <noreply@quantumsphere.eu>"
CONTACT_NOTIFY_EMAIL=info@quantumsphere.eu
```

- [ ] **Step 5: Commit**

```bash
git add lib/mailer.ts app/api/contact/route.ts package.json package-lock.json .env.local.example
git commit -m "feat: send email notification on contact form submission"
```

---

## Task 8: Add error feedback to AccommodationForm (Important)

On save or delete failure the form silently does nothing. Add state and error display.

**Files:**
- Modify: `app/(app)/accommodations/AccommodationForm.tsx`

- [ ] **Step 1: Add error state and display**

In `AccommodationForm.tsx`, add an error state and show it on failure. Replace the component with:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { FormSelect } from "@/components/portal/FormSelect";
import {
  saveAccommodationAction,
  deleteAccommodationAction,
} from "@/lib/actions/accommodations";

export function AccommodationForm({
  initial,
  workers,
  projects,
  selectedWorkerIds,
}: {
  initial?: {
    id: string;
    projectId: string | null;
    name: string;
    startDate: string;
    endDate: string;
    totalCost: number;
    currency: "USD" | "EUR";
    notes: string | null;
  };
  workers: { id: string; name: string; email: string }[];
  projects: { id: string; name: string }[];
  selectedWorkerIds: string[];
}) {
  const router = useRouter();
  const t = useTranslations("accommodations");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedWorkerIds));
  const [formError, setFormError] = useState<string | null>(null);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    if (initial?.id) fd.set("id", initial.id);
    for (const id of selected) fd.append("workerIds", id);
    start(async () => {
      const r = await saveAccommodationAction(fd);
      if (r.ok) {
        router.push("/accommodations");
      } else {
        setFormError(tCommon("saveError"));
      }
    });
  }

  function onDelete() {
    if (!initial?.id) return;
    setFormError(null);
    const fd = new FormData();
    fd.set("id", initial.id);
    start(async () => {
      const r = await deleteAccommodationAction(fd);
      if (r.ok) {
        router.push("/accommodations");
      } else {
        setFormError(tCommon("deleteError"));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-2xl" noValidate>
      <FormField label={tCommon("name")} name="name" defaultValue={initial?.name} required />
      <FormSelect
        label="Project"
        name="projectId"
        defaultValue={initial?.projectId ?? ""}
        options={[{ value: "", label: "— none —" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("startDate")} name="startDate" type="date" defaultValue={initial?.startDate} required />
        <FormField label={t("endDate")} name="endDate" type="date" defaultValue={initial?.endDate} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("totalCost")} name="totalCost" type="number" step="0.01" defaultValue={initial?.totalCost} required />
        <FormSelect
          label={tCommon("currency")}
          name="currency"
          defaultValue={initial?.currency ?? "USD"}
          options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }]}
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-navy block mb-2">Workers</label>
        <div className="grid gap-2 sm:grid-cols-2 max-h-72 overflow-auto border border-border-soft rounded-md p-3 bg-bg">
          {workers.map((w) => (
            <label key={w.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.has(w.id)} onChange={() => toggle(w.id)} />
              <span>{w.name} <span className="text-muted text-xs">{w.email}</span></span>
            </label>
          ))}
        </div>
      </div>
      <FormField label={tCommon("notes")} name="notes" defaultValue={initial?.notes ?? ""} />

      {formError && (
        <p role="alert" className="text-sm text-red-600">{formError}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {tCommon("save")}
        </Button>
        {initial?.id && (
          <Button onClick={onDelete} variant="secondary" disabled={pending}>
            {tCommon("delete")}
          </Button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Add missing translation keys**

In `messages/en.json`, add to the `"common"` object:
```json
"saveError": "Failed to save. Please try again.",
"deleteError": "Failed to delete. Please try again."
```

In `messages/sk.json`, add the same keys (Slovak translation):
```json
"saveError": "Uloženie zlyhalo. Skúste to znova.",
"deleteError": "Vymazanie zlyhalo. Skúste to znova."
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/accommodations/AccommodationForm.tsx" messages/en.json messages/sk.json
git commit -m "fix: show error message on AccommodationForm save/delete failure"
```

---

## Task 9: Fix hardcoded lang="en" in root layout (Important)

The root layout always renders `lang="en"` even for Slovak users.

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/(app)/layout.tsx` (portal layout already resolves locale — use it there)

The root layout does not know the locale (it's above the intl provider). The fix: move the `lang` attribute to the portal layout for portal routes, and set `lang="en"` as the default in the root layout (since the public site is English-only). The portal users who speak Slovak will get the correct `lang` from the nested layout.

Actually, the cleanest approach: remove `lang="en"` from `app/layout.tsx` and add it dynamically in `app/(app)/layout.tsx` where the locale is known.

- [ ] **Step 1: Remove lang from root layout**

In `app/layout.tsx`, the `<html>` element currently is:
```typescript
<html
  lang="en"
  className={`${fraunces.variable} ${jakarta.variable} ${mono.variable}`}
>
```

The root layout serves both the public site (always English) and the portal (en/sk). Since Next.js doesn't allow setting html attributes from nested layouts without hydration tricks, the pragmatic fix is:
- Keep `lang="en"` in the root layout (correct for the public site)
- The portal is a nested layout — use `suppressHydrationWarning` on `<html>` and let the `NextIntlClientProvider` in the portal layout handle the locale for client components

This is the safest change. No code change needed to root layout itself. Instead document that the `lang` reflects the public site default and screen reader support for the portal's Slovak locale requires a future `app/(app)/layout.tsx` wrapper that sets the `lang` via a client component.

Skip code change for this item — document the known limitation in a code comment.

In `app/layout.tsx`, add `suppressHydrationWarning` to `<html>`:
```typescript
<html
  lang="en"
  suppressHydrationWarning
  className={`${fraunces.variable} ${jakarta.variable} ${mono.variable}`}
>
```

- [ ] **Step 2: Set lang dynamically in the portal layout**

In `app/(app)/layout.tsx`, after `const locale = await getLocale();`, the portal layout renders inside the root layout's `<html>` — we can't change `lang` from a nested layout without a client component. The proper fix requires a client component that sets `document.documentElement.lang`.

Create `components/portal/LangSync.tsx`:

```typescript
"use client";

import { useEffect } from "react";

export function LangSync({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
```

In `app/(app)/layout.tsx`, import and render it:
```typescript
import { LangSync } from "@/components/portal/LangSync";

// Inside the return, after <NextIntlClientProvider ...>:
<NextIntlClientProvider messages={messages} locale={locale}>
  <LangSync locale={locale} />
  <div className="min-h-screen flex bg-bg">
    ...
  </div>
</NextIntlClientProvider>
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx "app/(app)/layout.tsx" components/portal/LangSync.tsx
git commit -m "fix: sync html lang attribute to active locale in portal"
```

---

## Task 10: Add error.tsx boundary to the app group (Important)

Without an error boundary, unhandled exceptions in portal pages expose Next.js error overlays with stack traces in production.

**Files:**
- Create: `app/(app)/error.tsx`

- [ ] **Step 1: Create error boundary**

Create `app/(app)/error.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <h2 className="text-xl font-semibold text-navy">Something went wrong</h2>
      <p className="text-sm text-muted max-w-sm">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/error.tsx"
git commit -m "fix: add error boundary for portal app group"
```

---

## Task 11: Fix seed file password logging (Minor)

The seed file logs the admin plaintext password to stdout, risking CI log exposure.

**Files:**
- Modify: `prisma/seed.ts:35`

- [ ] **Step 1: Remove password from log output**

In `prisma/seed.ts`, find line 35:
```typescript
console.log(`Seeded admin: ${admin.username} (password: ${password})`);
```

Replace with:
```typescript
console.log(`Seeded admin: ${admin.username}`);
```

- [ ] **Step 2: Commit**

```bash
git add prisma/seed.ts
git commit -m "fix: remove plaintext password from seed script stdout"
```

---

## Task 12: Add safety comment to Docker Compose (Minor)

`docker-compose.yml` has a hardcoded dev password with no warning against production use.

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add comment**

In `docker-compose.yml`, find the `POSTGRES_PASSWORD` line and add a comment above it:

```yaml
# DEV ONLY — replace with a Docker secret or env var reference before production deployment
POSTGRES_PASSWORD: qs_local_dev
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "docs: warn that docker-compose DB password is dev-only"
```

---

## Self-Review

**Spec coverage check:**
- ❌ Task 1: SKIPPED — restoring middleware.ts is wrong for Next.js 16 and crashes the PC (see warning under Task 1). middleware.ts correctly removed in e5bd068.
- ✅ Task 2: activityLogs unbounded query fixed (Critical #2)
- ✅ Task 3: Math.random() replaced (Critical #4 — temp passwords)
- ✅ Task 4: Wages date filtering pushed to DB (Critical #3)
- ✅ Task 5: Login redirect validated (Important #6)
- ✅ Task 6: Rate limiting on contact form (Important #8)
- ✅ Task 7: Email notification on contact form (Important #8)
- ✅ Task 8: AccommodationForm error feedback (Important #10)
- ✅ Task 9: lang attribute synced to locale (Important #11)
- ✅ Task 10: error.tsx boundary added (Important #16)
- ✅ Task 11: Seed password not logged (Minor #12)
- ✅ Task 12: Docker Compose comment (Minor #13)

**Not in scope (deferred by design):**
- Financial Decimal precision (requires large refactor, low practical risk for current data volumes)
- Admin bypass of activity check for claim deletion (intentional design, documented in review)
- No CSRF token (framework handles it via SameSite=Lax and origin checks)
- mustChangePassword redirect in middleware (intentional layout-based approach)
