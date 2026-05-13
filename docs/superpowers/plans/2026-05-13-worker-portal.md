# Worker Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an authenticated worker portal to the existing Quantum Sphere Next.js app: admin creates projects → sections → tables (modules = A×B−C), assigns workers with per-project per-action prices, manages accommodation bookings, and computes wages. Workers log daily tie/connect counts.

**Architecture:** Single Next.js app, split into two route groups: `(public)` (existing marketing site, untouched) and `(app)` (the new portal). Postgres via Prisma; Auth.js v5 with Credentials + JWT sessions; next-intl for EN/SK; server actions for all mutations.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4, Prisma + Postgres, `next-auth@5` (Auth.js v5), `bcryptjs`, `next-intl`, `zod`, `vitest`.

**Working directory:** `C:\Users\ASMAEL\Documents\qs-web` (Windows / PowerShell).

---

## File map

```
qs-web/
  app/
    (public)/                              MOVED — existing landing site
      layout.tsx                           MOVED from app/layout.tsx (marketing layout)
      page.tsx                             MOVED from app/page.tsx
      contact/page.tsx                     MOVED
      contact/thanks/page.tsx              MOVED
      api/contact/route.ts                 MOVED to (public) wedge
    (app)/
      layout.tsx                           portal shell (sidebar, locale, auth)
      login/page.tsx
      logout/route.ts
      dashboard/page.tsx                   worker home
      projects/
        page.tsx                           admin list
        new/page.tsx
        [projectId]/
          page.tsx                         shared overview
          log/page.tsx                     worker logging UI
          edit/page.tsx                    admin editor (sections, tables, workers, prices)
      workers/
        page.tsx
        new/page.tsx
        [userId]/page.tsx
      accommodations/
        page.tsx
        new/page.tsx
        [id]/page.tsx
      wages/page.tsx
    api/auth/[...nextauth]/route.ts        Auth.js handler
    layout.tsx                             root shell (html/body, fonts) — slimmer
    globals.css                            unchanged
  auth.ts                                  Auth.js v5 config (root)
  middleware.ts                            route protection
  lib/
    prisma.ts                              Prisma singleton
    portal/
      modules.ts                           computeModules({rows, cols, skipped})
      modules.test.ts
      over-cap.ts                          checkOverCap (invariant)
      over-cap.test.ts
      wages.ts                             computeWages (canonical math)
      wages.test.ts
      session.ts                           auth-guard helpers (requireUser, requireAdmin)
      money.ts                             format currency
    actions/
      auth.ts                              login/logout server actions
      workers.ts                           createWorker, updateWorker, resetPassword, deactivate
      projects.ts                          create/update/close project, sections, tables
      project-workers.ts                   assignWorker, updatePrices, removeAssignment
      accommodations.ts                    create/update/delete accommodation
      activity.ts                          logActivity, updateLog, deleteLog
    i18n/
      config.ts                            locales, default
      request.ts                           next-intl request config
    content.ts                             unchanged (landing-page copy)
    contact-schema.ts                      unchanged
  messages/
    en.json
    sk.json
  components/
    portal/
      Sidebar.tsx
      TopBar.tsx
      LocaleToggle.tsx
      DataTable.tsx                        thin thead/tbody renderer
      FormField.tsx                        shared input+label+error
      FormSelect.tsx                       shared select
      CounterRow.tsx                       worker per-action +/− counter
      WageRow.tsx                          one row of the wages table
      ProjectStatsBadge.tsx
      ActivityLogList.tsx                  recent entries for a (worker, table)
    ui/...                                 unchanged primitives
    Nav.tsx, Footer.tsx                    unchanged (marketing only)
    sections/...                           unchanged
  prisma/
    schema.prisma
    migrations/...
    seed.ts                                creates first admin
  docker-compose.yml                       local Postgres
  .env.local.example
  vitest.config.ts                         (if not present)
```

**Migration note:** Tasks 4–5 move existing landing files into `app/(public)/`. Route groups don't change URLs (`/`, `/contact`, etc. stay the same). The old `app/layout.tsx` becomes the marketing layout under `(public)`; a slim new `app/layout.tsx` becomes the root shell shared by both route groups.

---

## Task 0: Local Postgres + dependencies

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.local.example`
- Create: `.env.local` (gitignored)
- Modify: `.gitignore`
- Modify: `package.json` (new deps via npm install)

- [ ] **Step 1: Add Postgres docker-compose**

Create `docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: qs-web-db
    environment:
      POSTGRES_USER: qs
      POSTGRES_PASSWORD: qs_local_dev
      POSTGRES_DB: qs_web
    ports:
      - "5432:5432"
    volumes:
      - qs-web-db:/var/lib/postgresql/data
volumes:
  qs-web-db:
```

- [ ] **Step 2: Add env example + actual env**

Create `.env.local.example`:
```
DATABASE_URL="postgresql://qs:qs_local_dev@localhost:5432/qs_web?schema=public"
AUTH_SECRET="generate with: openssl rand -base64 32"
```

Create `.env.local` (gitignored) — generate a real AUTH_SECRET locally:
```powershell
$secret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
@"
DATABASE_URL=postgresql://qs:qs_local_dev@localhost:5432/qs_web?schema=public
AUTH_SECRET=$secret
"@ | Out-File -Encoding utf8 -NoNewline .env.local
```

- [ ] **Step 3: Ensure `.env.local` is gitignored**

Verify `.env*` line in `.gitignore`. If `.env.local` is not covered, append:
```
.env.local
```

- [ ] **Step 4: Install dependencies**

```powershell
npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter bcryptjs next-intl
npm install -D @types/bcryptjs ts-node
```

Note: `next-auth@beta` is Auth.js v5; we use it without the Prisma adapter for credentials, but install `@auth/prisma-adapter` for forward-compatibility. `bcryptjs` is pure JS (avoids native build issues on Windows). `ts-node` is for `prisma db seed`.

- [ ] **Step 5: Boot Postgres**

```powershell
docker compose up -d db
docker compose ps
```
Expected: container `qs-web-db` is `Up` and healthy. Port 5432 listening.

If Docker is not installed, abort and report BLOCKED. Do not substitute SQLite — the schema uses Postgres-specific Decimal precision.

- [ ] **Step 6: Commit**

```powershell
git add docker-compose.yml .env.local.example .gitignore package.json package-lock.json
git commit -m "chore: add local Postgres + portal dependencies"
```

---

## Task 1: Prisma schema + first migration + seed admin

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `lib/prisma.ts`
- Modify: `package.json` (add `prisma` block + scripts)

- [ ] **Step 1: Initialize Prisma directory**

```powershell
npx prisma init --datasource-provider postgresql
```
This creates `prisma/schema.prisma` and an `.env` file. **Delete the new `.env`** (we use `.env.local` instead):
```powershell
Remove-Item .env -ErrorAction SilentlyContinue
```

- [ ] **Step 2: Overwrite `prisma/schema.prisma` entirely**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role           { ADMIN WORKER }
enum Locale         { EN SK }
enum ProjectStatus  { ACTIVE CLOSED }
enum ActivityAction { TIE CONNECT }
enum Currency       { USD EUR }

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(WORKER)
  language     Locale   @default(EN)
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())

  projectWorkers     ProjectWorker[]
  accommodationStays AccommodationWorker[]
}

model Project {
  id        String        @id @default(cuid())
  name      String
  location  String?
  status    ProjectStatus @default(ACTIVE)
  createdAt DateTime      @default(now())
  closedAt  DateTime?

  sections       Section[]
  projectWorkers ProjectWorker[]
  accommodations Accommodation[]
}

model Section {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name       String
  orderIndex Int      @default(0)
  tables     Table[]

  @@index([projectId])
}

model Table {
  id         String   @id @default(cuid())
  sectionId  String
  section    Section  @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  name       String
  rows       Int
  cols       Int
  skipped    Int      @default(0)
  orderIndex Int      @default(0)
  createdAt  DateTime @default(now())

  activityLogs ActivityLog[]

  @@index([sectionId])
}

model ProjectWorker {
  id           String   @id @default(cuid())
  projectId    String
  userId       String
  priceTie     Decimal  @db.Decimal(10, 2)
  priceConnect Decimal  @db.Decimal(10, 2)
  createdAt    DateTime @default(now())

  project Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User          @relation(fields: [userId], references: [id], onDelete: Cascade)
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
  table         Table         @relation(fields: [tableId],         references: [id], onDelete: Cascade)

  @@index([projectWorkerId, workDate])
  @@index([tableId, action])
}

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

- [ ] **Step 3: Run first migration**

```powershell
npx prisma migrate dev --name init
```
Expected: migration `init` created under `prisma/migrations/`, Prisma client generated, no errors. The DB now has all tables.

If you get `Environment variable not found: DATABASE_URL`, prepend `dotenv -e .env.local --` or set the env var inline:
```powershell
$env:DATABASE_URL = (Get-Content .env.local | Where-Object { $_ -match "^DATABASE_URL=" } | ForEach-Object { $_ -replace "^DATABASE_URL=", "" })
npx prisma migrate dev --name init
```

- [ ] **Step 4: Create `lib/prisma.ts` (singleton)**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 5: Add seed script `prisma/seed.ts`**

```ts
import { PrismaClient, Role, Locale } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@quantumsphere.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: "Quantum Sphere Admin",
      role: Role.ADMIN,
      language: Locale.EN,
    },
  });

  console.log(`Seeded admin: ${admin.email} (password: ${password})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 6: Wire seed into `package.json`**

Add a top-level `prisma` block and a `seed` script. Example resulting fragments:

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "db:seed": "prisma db seed",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio"
},
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

- [ ] **Step 7: Seed**

```powershell
npx prisma db seed
```
Expected: `Seeded admin: admin@quantumsphere.local (password: ChangeMe!2026)`. If it errors complaining about ts-node, install it (`npm install -D ts-node`) and retry.

- [ ] **Step 8: Commit**

```powershell
git add prisma package.json package-lock.json lib/prisma.ts
git commit -m "feat: prisma schema, initial migration, admin seed"
```

---

## Task 2: Auth.js v5 — config + middleware

**Files:**
- Create: `auth.ts`
- Create: `middleware.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `types/next-auth.d.ts`

- [ ] **Step 1: Create `auth.ts` (root of project)**

```ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const config: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          language: user.language,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: "ADMIN" | "WORKER" }).role;
        token.language = (user as { language: "EN" | "SK" }).language;
      }
      if (trigger === "update" && session?.language) {
        token.language = session.language;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "WORKER";
        session.user.language = token.language as "EN" | "SK";
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
```

- [ ] **Step 2: Add session typings `types/next-auth.d.ts`**

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "WORKER";
      language: "EN" | "SK";
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "WORKER";
    language: "EN" | "SK";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "WORKER";
    language: "EN" | "SK";
  }
}
```

- [ ] **Step 3: Update `tsconfig.json` to include the typings dir**

If `tsconfig.json`'s `"include"` doesn't already pick up the new file, add it. Default Next.js include (`["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`) already covers it.

- [ ] **Step 4: Add Auth.js route handler `app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 5: Add `middleware.ts` (root)**

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/api/contact") ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/logos") ||
    pathname === "/panel-grid.svg" ||
    pathname === "/coverage-map.svg" ||
    pathname === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  if (!session?.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const adminOnlyPrefixes = ["/projects", "/workers", "/accommodations", "/wages"];
  const adminOnlySubpaths = ["/edit", "/new"];
  const isAdminOnly =
    adminOnlyPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    adminOnlySubpaths.some((sp) => pathname.endsWith(sp));

  // Worker can access /projects/:id/log
  const isWorkerProjectLog = /^\/projects\/[^/]+\/log\/?$/.test(pathname);

  if (isAdminOnly && session.user.role !== "ADMIN" && !isWorkerProjectLog) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 6: Verify build**

```powershell
npm run build
```
Expected: build succeeds. New route `/api/auth/[...nextauth]` appears.

- [ ] **Step 7: Commit**

```powershell
git add auth.ts middleware.ts app/api/auth types/next-auth.d.ts
git commit -m "feat: Auth.js v5 credentials + role-based middleware"
```

---

## Task 3: i18n scaffolding (next-intl)

**Files:**
- Create: `lib/i18n/config.ts`
- Create: `lib/i18n/request.ts`
- Create: `messages/en.json`
- Create: `messages/sk.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Create locale config `lib/i18n/config.ts`**

```ts
export const LOCALES = ["en", "sk"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function normalizeLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const lower = input.toLowerCase();
  if (lower.startsWith("sk")) return "sk";
  return "en";
}
```

- [ ] **Step 2: Create request config `lib/i18n/request.ts`**

```ts
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "./config";

export default getRequestConfig(async () => {
  const session = await auth();
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;

  let locale: Locale = DEFAULT_LOCALE;
  if (session?.user?.language) {
    locale = session.user.language.toLowerCase() as Locale;
  } else if (cookieLocale) {
    locale = normalizeLocale(cookieLocale);
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Wire next-intl in `next.config.ts`**

Read the current `next.config.ts`. If it exports a default `nextConfig` object, wrap it with `withNextIntl`. Resulting file:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // existing settings preserved
};

export default withNextIntl(nextConfig);
```

If `next.config.ts` has other content, preserve all of it inside `nextConfig` and only wrap the export.

- [ ] **Step 4: Create `messages/en.json`**

```json
{
  "common": {
    "appName": "Quantum Sphere Portal",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "back": "Back",
    "create": "Create",
    "submit": "Submit",
    "loading": "Loading...",
    "yes": "Yes",
    "no": "No",
    "search": "Search",
    "actions": "Actions",
    "today": "Today",
    "from": "From",
    "to": "To",
    "currency": "Currency",
    "total": "Total",
    "language": "Language",
    "name": "Name",
    "email": "Email",
    "password": "Password",
    "notes": "Notes",
    "status": "Status",
    "active": "Active",
    "closed": "Closed"
  },
  "login": {
    "title": "Sign in",
    "submit": "Sign in",
    "error": "Invalid email or password.",
    "languageLabel": "Language"
  },
  "nav": {
    "dashboard": "Dashboard",
    "projects": "Projects",
    "workers": "Workers",
    "accommodations": "Accommodations",
    "wages": "Wages",
    "signOut": "Sign out"
  },
  "projects": {
    "list": "Projects",
    "new": "New project",
    "name": "Project name",
    "location": "Location",
    "section": "Section",
    "newSection": "Add section",
    "table": "Table",
    "newTable": "Add table",
    "rows": "Rows (A)",
    "cols": "Columns (B)",
    "skipped": "Skipped (C)",
    "modules": "Modules",
    "modulesTotal": "{count} modules total",
    "assignedWorkers": "Assigned workers",
    "assignWorker": "Assign worker",
    "priceTie": "Price per tie",
    "priceConnect": "Price per connect",
    "tied": "Tied",
    "connected": "Connected",
    "noProjects": "No projects yet.",
    "close": "Close project",
    "reopen": "Reopen"
  },
  "workers": {
    "list": "Workers",
    "new": "New worker",
    "resetPassword": "Reset password",
    "deactivate": "Deactivate",
    "reactivate": "Reactivate",
    "role": "Role",
    "admin": "Admin",
    "worker": "Worker",
    "tempPassword": "Temporary password: {password}"
  },
  "accommodations": {
    "list": "Accommodations",
    "new": "New accommodation",
    "startDate": "Start date",
    "endDate": "End date",
    "totalCost": "Total cost",
    "workersAssigned": "{count} workers assigned",
    "perWorker": "Per worker: {amount}"
  },
  "wages": {
    "title": "Wages",
    "from": "From",
    "to": "To",
    "projectFilter": "Project (optional)",
    "all": "All projects",
    "calculate": "Calculate",
    "exportCsv": "Export CSV",
    "earnings": "Earnings",
    "accommodation": "Accommodation",
    "wage": "Wage",
    "missingPrice": "Set prices for this worker on the project to compute wages.",
    "mixedCurrencies": "Mixed currencies in this range; figures are nominal.",
    "noData": "No activity in this range."
  },
  "log": {
    "title": "Log work",
    "iTied": "I tied today",
    "iConnected": "I connected today",
    "workDate": "Work date",
    "tableProgress": "{tied}/{total} tied · {connected}/{total} connected",
    "submit": "Add entry",
    "recentEntries": "Recent entries",
    "editWindowOver": "Entry locked (over 24h old)",
    "overCap": "Cannot exceed {remaining} remaining for this action."
  },
  "errors": {
    "validation": "Please check the form.",
    "unauthorized": "You don't have permission to do that.",
    "notFound": "Not found.",
    "unknown": "Something went wrong."
  }
}
```

- [ ] **Step 5: Create `messages/sk.json` (Slovak)**

```json
{
  "common": {
    "appName": "Quantum Sphere Portál",
    "save": "Uložiť",
    "cancel": "Zrušiť",
    "delete": "Vymazať",
    "edit": "Upraviť",
    "back": "Späť",
    "create": "Vytvoriť",
    "submit": "Odoslať",
    "loading": "Načítava sa...",
    "yes": "Áno",
    "no": "Nie",
    "search": "Hľadať",
    "actions": "Akcie",
    "today": "Dnes",
    "from": "Od",
    "to": "Do",
    "currency": "Mena",
    "total": "Spolu",
    "language": "Jazyk",
    "name": "Meno",
    "email": "Email",
    "password": "Heslo",
    "notes": "Poznámky",
    "status": "Stav",
    "active": "Aktívny",
    "closed": "Uzavretý"
  },
  "login": {
    "title": "Prihlásenie",
    "submit": "Prihlásiť sa",
    "error": "Nesprávny email alebo heslo.",
    "languageLabel": "Jazyk"
  },
  "nav": {
    "dashboard": "Prehľad",
    "projects": "Projekty",
    "workers": "Pracovníci",
    "accommodations": "Ubytovanie",
    "wages": "Mzdy",
    "signOut": "Odhlásiť sa"
  },
  "projects": {
    "list": "Projekty",
    "new": "Nový projekt",
    "name": "Názov projektu",
    "location": "Lokalita",
    "section": "Sekcia",
    "newSection": "Pridať sekciu",
    "table": "Tabuľka",
    "newTable": "Pridať tabuľku",
    "rows": "Riadky (A)",
    "cols": "Stĺpce (B)",
    "skipped": "Vynechané (C)",
    "modules": "Moduly",
    "modulesTotal": "{count} modulov spolu",
    "assignedWorkers": "Priradení pracovníci",
    "assignWorker": "Priradiť pracovníka",
    "priceTie": "Cena za uviazanie",
    "priceConnect": "Cena za zapojenie",
    "tied": "Uviazané",
    "connected": "Zapojené",
    "noProjects": "Zatiaľ žiadne projekty.",
    "close": "Uzavrieť projekt",
    "reopen": "Otvoriť"
  },
  "workers": {
    "list": "Pracovníci",
    "new": "Nový pracovník",
    "resetPassword": "Resetovať heslo",
    "deactivate": "Deaktivovať",
    "reactivate": "Aktivovať",
    "role": "Rola",
    "admin": "Administrátor",
    "worker": "Pracovník",
    "tempPassword": "Dočasné heslo: {password}"
  },
  "accommodations": {
    "list": "Ubytovanie",
    "new": "Nové ubytovanie",
    "startDate": "Dátum začiatku",
    "endDate": "Dátum konca",
    "totalCost": "Celková cena",
    "workersAssigned": "{count} priradených pracovníkov",
    "perWorker": "Na pracovníka: {amount}"
  },
  "wages": {
    "title": "Mzdy",
    "from": "Od",
    "to": "Do",
    "projectFilter": "Projekt (voliteľné)",
    "all": "Všetky projekty",
    "calculate": "Vypočítať",
    "exportCsv": "Exportovať CSV",
    "earnings": "Zárobok",
    "accommodation": "Ubytovanie",
    "wage": "Mzda",
    "missingPrice": "Nastavte ceny pre tohto pracovníka na projekte.",
    "mixedCurrencies": "Rôzne meny v tomto rozsahu; čísla sú orientačné.",
    "noData": "Žiadna aktivita v tomto rozsahu."
  },
  "log": {
    "title": "Zapísať prácu",
    "iTied": "Dnes som uviazal",
    "iConnected": "Dnes som zapojil",
    "workDate": "Dátum práce",
    "tableProgress": "{tied}/{total} uviazaných · {connected}/{total} zapojených",
    "submit": "Pridať záznam",
    "recentEntries": "Posledné záznamy",
    "editWindowOver": "Záznam uzamknutý (starší ako 24h)",
    "overCap": "Nemôžete prekročiť {remaining} zostávajúcich pre túto akciu."
  },
  "errors": {
    "validation": "Skontrolujte formulár.",
    "unauthorized": "Nemáte oprávnenie.",
    "notFound": "Nenájdené.",
    "unknown": "Niečo sa pokazilo."
  }
}
```

- [ ] **Step 6: Build to verify next-intl wired**

```powershell
npm run build
```
Expected: success. (No portal pages use next-intl yet, but the plugin must be valid.)

- [ ] **Step 7: Commit**

```powershell
git add next.config.ts lib/i18n messages
git commit -m "feat: next-intl scaffolding with en/sk message catalogs"
```

---

## Task 4: Split landing site into `(public)` route group

**Files (move, don't duplicate):**
- Move: `app/layout.tsx`            → `app/(public)/layout.tsx`
- Move: `app/page.tsx`               → `app/(public)/page.tsx`
- Move: `app/contact/page.tsx`       → `app/(public)/contact/page.tsx`
- Move: `app/contact/thanks/page.tsx` → `app/(public)/contact/thanks/page.tsx`
- Move: `app/api/contact/route.ts`   → `app/(public)/api/contact/route.ts`  (no — `/api/contact` should stay)
- Create: `app/layout.tsx`           (new slim root: just html/body wrapper)
- Modify: `app/(public)/layout.tsx`  (drop html/body, keep marketing chrome)

**Notes:** `/api/contact` must remain at `/api/contact` (not under `(public)` if Next.js treats route groups as URL-affecting — it does not, but to keep things obvious leave the API route at `app/api/contact/route.ts`). The landing page route group split happens for **page** routes only.

- [ ] **Step 1: Inspect current `app/layout.tsx`**

```powershell
Get-Content app/layout.tsx
```
Confirm it's the file that has Inter font + html/body + metadata. We'll split it into two layouts.

- [ ] **Step 2: Create new slim root `app/layout.tsx`** (overwrites the current one)

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Quantum Sphere",
  description: "Solar subcontracting at utility scale.",
  metadataBase: new URL("https://quantumsphere.example"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create the public route group layout `app/(public)/layout.tsx`**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quantum Sphere — Solar subcontracting at utility scale",
  description:
    "Quantum Sphere is a solar construction subcontractor for general contractors and EPCs. Rooftop, ground-mount, racking, BOS, commissioning, and O&M.",
  openGraph: {
    title: "Quantum Sphere",
    description: "Solar subcontracting at utility scale.",
    type: "website",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

- [ ] **Step 4: Move the landing page files**

```powershell
New-Item -ItemType Directory -Force "app/(public)" | Out-Null
New-Item -ItemType Directory -Force "app/(public)/contact" | Out-Null
New-Item -ItemType Directory -Force "app/(public)/contact/thanks" | Out-Null

Move-Item app/page.tsx "app/(public)/page.tsx"
Move-Item app/contact/page.tsx "app/(public)/contact/page.tsx"
Move-Item app/contact/thanks/page.tsx "app/(public)/contact/thanks/page.tsx"
Remove-Item app/contact/thanks -Force -ErrorAction SilentlyContinue
Remove-Item app/contact -Force -ErrorAction SilentlyContinue
```

(Leave `app/api/contact/route.ts` in place — API routes don't need the route group split.)

- [ ] **Step 5: Verify build + landing site renders**

```powershell
npm run build
```
Expected: success, routes `/`, `/contact`, `/contact/thanks`, `/api/contact` all listed.

Quick runtime check (start dev in background or rebuild + curl):
```powershell
npm run dev   # in background
Start-Sleep -Seconds 12
(Invoke-WebRequest http://localhost:3000/ -UseBasicParsing).StatusCode
(Invoke-WebRequest http://localhost:3000/contact -UseBasicParsing).StatusCode
```
Both should be 200. Stop the dev server.

- [ ] **Step 6: Commit**

```powershell
git add app
git commit -m "refactor: move landing site into (public) route group"
```

---

## Task 5: Portal layout shell

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `components/portal/Sidebar.tsx`
- Create: `components/portal/TopBar.tsx`
- Create: `components/portal/LocaleToggle.tsx`
- Create: `lib/portal/session.ts`

- [ ] **Step 1: Create `lib/portal/session.ts` (auth-guard helpers)**

```ts
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
```

- [ ] **Step 2: Create `components/portal/LocaleToggle.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function LocaleToggle({ current }: { current: "en" | "sk" }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function switchTo(next: "en" | "sk") {
    if (next === current) return;
    start(async () => {
      document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 text-xs font-semibold tracking-wide">
      {(["en", "sk"] as const).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => switchTo(l)}
          className={`uppercase px-2 py-1 rounded ${
            l === current
              ? "bg-navy text-bg"
              : "text-slate-ink hover:text-navy"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `components/portal/Sidebar.tsx`**

```tsx
import Link from "next/link";
import { useTranslations } from "next-intl";

export function Sidebar({ role }: { role: "ADMIN" | "WORKER" }) {
  const t = useTranslations("nav");

  const items =
    role === "ADMIN"
      ? [
          { href: "/dashboard", label: t("dashboard") },
          { href: "/projects", label: t("projects") },
          { href: "/workers", label: t("workers") },
          { href: "/accommodations", label: t("accommodations") },
          { href: "/wages", label: t("wages") },
        ]
      : [{ href: "/dashboard", label: t("dashboard") }];

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border-soft bg-surface min-h-screen">
      <div className="p-5 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--color-navy) 0 50%, var(--color-accent) 50% 100%)",
            }}
          />
          <span className="font-semibold tracking-[0.2em] text-navy text-sm">
            PORTAL
          </span>
        </div>
      </div>
      <nav className="flex flex-col p-2 gap-1">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className="px-3 py-2 text-sm rounded-md text-slate-ink hover:bg-bg hover:text-navy"
          >
            {i.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Create `components/portal/TopBar.tsx`**

```tsx
import { useTranslations } from "next-intl";
import { LocaleToggle } from "@/components/portal/LocaleToggle";
import { signOut } from "@/auth";

export function TopBar({
  name,
  email,
  language,
}: {
  name: string;
  email: string;
  language: "en" | "sk";
}) {
  const t = useTranslations("nav");

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border-soft bg-surface px-6 py-3">
      <div className="text-sm text-slate-ink">
        <span className="text-navy font-semibold">{name}</span>
        <span className="ml-2 text-muted text-xs">{email}</span>
      </div>
      <div className="flex items-center gap-4">
        <LocaleToggle current={language} />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-slate-ink hover:text-navy"
          >
            {t("signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Create the portal layout `app/(app)/layout.tsx`**

```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/portal/session";
import { Sidebar } from "@/components/portal/Sidebar";
import { TopBar } from "@/components/portal/TopBar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const messages = await getMessages();
  const locale = await getLocale();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div className="min-h-screen flex bg-bg">
        <Sidebar role={user.role} />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar
            name={user.name ?? user.email ?? ""}
            email={user.email ?? ""}
            language={(user.language?.toLowerCase() ?? "en") as "en" | "sk"}
          />
          <main className="flex-1 p-6 md:p-10">{children}</main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 6: Sanity-check build**

```powershell
npm run build
```
Expected: success. No portal pages yet, but the layout compiles.

- [ ] **Step 7: Commit**

```powershell
git add app/\(app\)/layout.tsx components/portal lib/portal/session.ts
git commit -m "feat: portal layout shell with sidebar, top bar, locale toggle"
```

---

## Task 6: Login page

**Files:**
- Create: `app/(app)/login/page.tsx`
- Create: `lib/actions/auth.ts`

- [ ] **Step 1: Create the sign-in server action `lib/actions/auth.ts`**

```ts
"use server";

import { z } from "zod";
import { signIn } from "@/auth";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "invalid" };
  }
}
```

- [ ] **Step 2: Create the login page `app/(app)/login/page.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { LocaleToggle } from "@/components/portal/LocaleToggle";
import { loginAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await loginAction(fd);
      if (r.ok) {
        router.push(params.get("from") ?? "/dashboard");
        router.refresh();
      } else if (r.error === "validation") {
        setErrors(r.fieldErrors ?? {});
      } else {
        setFormError(t("error"));
      }
    });
  }

  const cookieLocale =
    typeof document !== "undefined"
      ? (document.cookie.match(/(?:^|; )locale=([^;]+)/)?.[1] as
          | "en"
          | "sk"
          | undefined) ?? "en"
      : "en";

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Container className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--color-navy) 0 50%, var(--color-accent) 50% 100%)",
            }}
          />
          <span className="font-semibold tracking-[0.2em] text-navy text-sm">
            QUANTUM SPHERE
          </span>
        </div>
        <LocaleToggle current={cookieLocale} />
      </Container>

      <main className="flex-1 grid place-items-center px-6">
        <div className="w-full max-w-sm bg-surface border border-border-soft rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-navy mb-6">{t("title")}</h1>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="text-sm font-semibold text-navy block mb-2">
                {tCommon("email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                aria-invalid={Boolean(errors.email)}
                className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-semibold text-navy block mb-2">
                {tCommon("password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>
            {formError && (
              <p role="alert" aria-live="polite" className="text-sm text-red-600">
                {formError}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={pending} className="w-full">
              {pending ? tCommon("loading") : t("submit")}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
```

The login page does NOT use the portal layout (it's a public-ish route inside `(app)`); we override the layout effect by rendering its own top-level div with no Sidebar/TopBar. Since `(app)/layout.tsx` calls `requireUser()` which redirects unauthenticated users to `/login`, we need `/login` to render without going through that guard.

**Important:** Because `/login` lives inside `(app)/login/page.tsx` and `(app)/layout.tsx` calls `requireUser()` first, the login page would redirect to itself in a loop. To fix this: add a check in `requireUser` to skip the redirect when the current pathname is `/login`. The cleaner fix is to move login OUT of `(app)`. **Do that:**

Move login: create `app/login/page.tsx` directly (not inside `(app)`):
```powershell
New-Item -ItemType Directory -Force app/login | Out-Null
Move-Item "app/(app)/login/page.tsx" "app/login/page.tsx"
Remove-Item "app/(app)/login" -Force -ErrorAction SilentlyContinue
```

`/login` is also in the middleware's public whitelist (Task 2), so unauthenticated requests reach the page. Good.

- [ ] **Step 3: Verify build + manual login flow**

```powershell
npm run build
```
Expected: success.

```powershell
npm run dev    # background
Start-Sleep -Seconds 12
(Invoke-WebRequest http://localhost:3000/login -UseBasicParsing).StatusCode
(Invoke-WebRequest http://localhost:3000/dashboard -UseBasicParsing -MaximumRedirection 0).StatusCode
```
Expected: `/login` returns 200; `/dashboard` returns 307 (redirect to `/login`).

Stop dev server.

- [ ] **Step 4: Commit**

```powershell
git add app/login lib/actions/auth.ts
git commit -m "feat: login page + signIn server action"
```

---

## Task 7: Domain logic — `computeModules` (TDD)

**Files:**
- Create: `lib/portal/modules.ts`
- Create: `lib/portal/modules.test.ts`

- [ ] **Step 1: Write failing test `lib/portal/modules.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { computeModules } from "./modules";

describe("computeModules", () => {
  it("returns rows * cols - skipped", () => {
    expect(computeModules({ rows: 10, cols: 20, skipped: 5 })).toBe(195);
  });

  it("treats skipped=0 normally", () => {
    expect(computeModules({ rows: 4, cols: 6, skipped: 0 })).toBe(24);
  });

  it("never returns negative — clamps to 0", () => {
    expect(computeModules({ rows: 2, cols: 2, skipped: 99 })).toBe(0);
  });

  it("rejects negative inputs by throwing", () => {
    expect(() => computeModules({ rows: -1, cols: 4, skipped: 0 })).toThrow();
    expect(() => computeModules({ rows: 4, cols: -1, skipped: 0 })).toThrow();
    expect(() => computeModules({ rows: 4, cols: 4, skipped: -1 })).toThrow();
  });

  it("rejects non-integers", () => {
    expect(() => computeModules({ rows: 1.5, cols: 4, skipped: 0 })).toThrow();
  });
});
```

- [ ] **Step 2: Run — expect failure**

```powershell
npm test -- modules
```
Expected: FAIL — `Cannot find module './modules'`.

- [ ] **Step 3: Implement `lib/portal/modules.ts`**

```ts
export interface ModuleDims {
  rows: number;
  cols: number;
  skipped: number;
}

export function computeModules({ rows, cols, skipped }: ModuleDims): number {
  for (const [name, v] of [["rows", rows], ["cols", cols], ["skipped", skipped]] as const) {
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`${name} must be a non-negative integer`);
    }
  }
  return Math.max(0, rows * cols - skipped);
}
```

- [ ] **Step 4: Run — expect 5 passed**

```powershell
npm test -- modules
```

- [ ] **Step 5: Commit**

```powershell
git add lib/portal/modules.ts lib/portal/modules.test.ts
git commit -m "feat(portal): computeModules with unit tests"
```

---

## Task 8: Domain logic — `checkOverCap` (TDD)

**Files:**
- Create: `lib/portal/over-cap.ts`
- Create: `lib/portal/over-cap.test.ts`

- [ ] **Step 1: Write failing test `lib/portal/over-cap.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { checkOverCap } from "./over-cap";

describe("checkOverCap", () => {
  it("ok when sum stays at or under cap", () => {
    expect(checkOverCap({ totalModules: 200, existing: 100, requested: 50, action: "TIE" }))
      .toEqual({ ok: true });
  });

  it("ok exactly at cap", () => {
    expect(checkOverCap({ totalModules: 200, existing: 150, requested: 50, action: "TIE" }))
      .toEqual({ ok: true });
  });

  it("rejects when sum exceeds cap and reports remaining", () => {
    const r = checkOverCap({ totalModules: 200, existing: 180, requested: 30, action: "CONNECT" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.remaining).toBe(20);
  });

  it("rejects zero or negative requested", () => {
    expect(checkOverCap({ totalModules: 200, existing: 0, requested: 0, action: "TIE" }).ok).toBe(false);
    expect(checkOverCap({ totalModules: 200, existing: 0, requested: -1, action: "TIE" }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```powershell
npm test -- over-cap
```

- [ ] **Step 3: Implement `lib/portal/over-cap.ts`**

```ts
export type Action = "TIE" | "CONNECT";

export type OverCapResult =
  | { ok: true }
  | { ok: false; reason: "over-cap" | "non-positive"; remaining: number; action: Action };

export function checkOverCap(input: {
  totalModules: number;
  existing: number;
  requested: number;
  action: Action;
}): OverCapResult {
  const { totalModules, existing, requested, action } = input;
  if (requested <= 0) {
    return { ok: false, reason: "non-positive", remaining: Math.max(0, totalModules - existing), action };
  }
  if (existing + requested > totalModules) {
    return { ok: false, reason: "over-cap", remaining: Math.max(0, totalModules - existing), action };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run — expect 4 passed**

```powershell
npm test -- over-cap
```

- [ ] **Step 5: Commit**

```powershell
git add lib/portal/over-cap.ts lib/portal/over-cap.test.ts
git commit -m "feat(portal): checkOverCap with unit tests"
```

---

## Task 9: Domain logic — `computeWages` (TDD)

**Files:**
- Create: `lib/portal/wages.ts`
- Create: `lib/portal/wages.test.ts`

This is the canonical wage math. Pure data in / data out — no Prisma here.

- [ ] **Step 1: Write failing test `lib/portal/wages.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { computeWages, type WageInput } from "./wages";

const baseInput: WageInput = {
  from: new Date("2026-05-01"),
  to: new Date("2026-05-31"),
  workers: [
    { id: "w1", name: "Alice" },
    { id: "w2", name: "Bob" },
  ],
  prices: [
    { projectId: "p1", userId: "w1", priceTie: 1.5, priceConnect: 2.0 },
    { projectId: "p1", userId: "w2", priceTie: 1.0, priceConnect: 1.5 },
  ],
  activity: [
    { userId: "w1", projectId: "p1", action: "TIE",     count: 100, workDate: new Date("2026-05-10") },
    { userId: "w1", projectId: "p1", action: "CONNECT", count: 50,  workDate: new Date("2026-05-12") },
    { userId: "w2", projectId: "p1", action: "TIE",     count: 80,  workDate: new Date("2026-05-15") },
  ],
  accommodations: [
    {
      id: "a1",
      totalCost: 300,
      currency: "USD",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-05-31"),
      workerIds: ["w1", "w2"],
      projectId: "p1",
    },
  ],
};

describe("computeWages", () => {
  it("computes earnings = count * price per action", () => {
    const r = computeWages(baseInput);
    const alice = r.rows.find((x) => x.userId === "w1")!;
    // Alice: 100*1.5 + 50*2.0 = 150 + 100 = 250
    expect(alice.earnings).toBe(250);
  });

  it("deducts equal-share accommodation when any overlap", () => {
    const r = computeWages(baseInput);
    const alice = r.rows.find((x) => x.userId === "w1")!;
    expect(alice.accommodation).toBe(150); // 300 / 2
    expect(alice.wage).toBe(100);          // 250 - 150
  });

  it("returns warning for worker without a price on a project they logged on", () => {
    const r = computeWages({
      ...baseInput,
      prices: baseInput.prices.filter((p) => !(p.userId === "w2" && p.projectId === "p1")),
    });
    const bob = r.rows.find((x) => x.userId === "w2")!;
    expect(bob.warnings).toContain("missing-price");
  });

  it("filters out activity outside the date range", () => {
    const r = computeWages({
      ...baseInput,
      from: new Date("2026-06-01"),
      to: new Date("2026-06-30"),
    });
    expect(r.rows.every((x) => x.earnings === 0)).toBe(true);
  });

  it("includes accommodation when it overlaps even partially", () => {
    const r = computeWages({
      ...baseInput,
      from: new Date("2026-05-15"),
      to: new Date("2026-05-16"),
      activity: [],
    });
    // No activity but accommodation overlaps → wage is negative full share
    const alice = r.rows.find((x) => x.userId === "w1")!;
    expect(alice.accommodation).toBe(150);
    expect(alice.wage).toBe(-150);
  });

  it("skips accommodation when fully outside range", () => {
    const r = computeWages({
      ...baseInput,
      from: new Date("2026-06-15"),
      to: new Date("2026-06-30"),
    });
    const alice = r.rows.find((x) => x.userId === "w1")!;
    expect(alice.accommodation).toBe(0);
  });

  it("applies optional projectId filter to activity and accommodation", () => {
    const r = computeWages({
      ...baseInput,
      projectId: "p2",
    });
    expect(r.rows.every((x) => x.earnings === 0 && x.accommodation === 0)).toBe(true);
  });

  it("flags mixed currencies when accommodations span more than one currency in the range", () => {
    const r = computeWages({
      ...baseInput,
      accommodations: [
        ...baseInput.accommodations,
        {
          id: "a2",
          totalCost: 200,
          currency: "EUR",
          startDate: new Date("2026-05-10"),
          endDate: new Date("2026-05-20"),
          workerIds: ["w1"],
          projectId: "p1",
        },
      ],
    });
    expect(r.mixedCurrencies).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```powershell
npm test -- wages
```

- [ ] **Step 3: Implement `lib/portal/wages.ts`**

```ts
export type Currency = "USD" | "EUR";

export interface WageInput {
  from: Date;
  to: Date;
  projectId?: string | null;
  workers: { id: string; name: string }[];
  prices: {
    projectId: string;
    userId: string;
    priceTie: number;
    priceConnect: number;
  }[];
  activity: {
    userId: string;
    projectId: string;
    action: "TIE" | "CONNECT";
    count: number;
    workDate: Date;
  }[];
  accommodations: {
    id: string;
    totalCost: number;
    currency: Currency;
    startDate: Date;
    endDate: Date;
    workerIds: string[];
    projectId: string | null;
  }[];
}

export interface WageRow {
  userId: string;
  name: string;
  earnings: number;
  accommodation: number;
  wage: number;
  breakdown: { tie: number; connect: number };
  warnings: string[];
}

export interface WageResult {
  rows: WageRow[];
  mixedCurrencies: boolean;
}

function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
  return a.start <= b.end && a.end >= b.start;
}

export function computeWages(input: WageInput): WageResult {
  const range = { start: input.from, end: input.to };
  const projectFilter = input.projectId ?? null;

  const priceLookup = new Map<string, { tie: number; connect: number }>();
  for (const p of input.prices) {
    priceLookup.set(`${p.userId}|${p.projectId}`, {
      tie: p.priceTie,
      connect: p.priceConnect,
    });
  }

  const rows: WageRow[] = input.workers.map((w) => ({
    userId: w.id,
    name: w.name,
    earnings: 0,
    accommodation: 0,
    wage: 0,
    breakdown: { tie: 0, connect: 0 },
    warnings: [],
  }));

  const rowById = new Map(rows.map((r) => [r.userId, r] as const));

  // Earnings
  for (const a of input.activity) {
    if (projectFilter && a.projectId !== projectFilter) continue;
    if (a.workDate < range.start || a.workDate > range.end) continue;
    const row = rowById.get(a.userId);
    if (!row) continue;
    const price = priceLookup.get(`${a.userId}|${a.projectId}`);
    if (!price) {
      if (!row.warnings.includes("missing-price")) row.warnings.push("missing-price");
      continue;
    }
    const rate = a.action === "TIE" ? price.tie : price.connect;
    const amount = a.count * rate;
    row.earnings += amount;
    if (a.action === "TIE") row.breakdown.tie += amount;
    else row.breakdown.connect += amount;
  }

  // Accommodation
  const overlappingAccommodations = input.accommodations.filter((acc) => {
    if (projectFilter && acc.projectId !== projectFilter) return false;
    return overlaps(range, { start: acc.startDate, end: acc.endDate });
  });

  for (const acc of overlappingAccommodations) {
    const share = acc.workerIds.length === 0 ? 0 : acc.totalCost / acc.workerIds.length;
    for (const wid of acc.workerIds) {
      const row = rowById.get(wid);
      if (!row) continue;
      row.accommodation += share;
    }
  }

  for (const r of rows) r.wage = r.earnings - r.accommodation;

  const distinctCurrencies = new Set(overlappingAccommodations.map((a) => a.currency));
  const mixedCurrencies = distinctCurrencies.size > 1;

  return { rows, mixedCurrencies };
}
```

- [ ] **Step 4: Run — expect 8 passed**

```powershell
npm test -- wages
```

- [ ] **Step 5: Commit**

```powershell
git add lib/portal/wages.ts lib/portal/wages.test.ts
git commit -m "feat(portal): computeWages with unit tests"
```

---

## Task 10: Workers admin — list, create, edit, reset password

**Files:**
- Create: `lib/actions/workers.ts`
- Create: `components/portal/FormField.tsx`
- Create: `components/portal/FormSelect.tsx`
- Create: `components/portal/DataTable.tsx`
- Create: `app/(app)/workers/page.tsx`
- Create: `app/(app)/workers/new/page.tsx`
- Create: `app/(app)/workers/[userId]/page.tsx`

- [ ] **Step 1: Shared form primitives**

Create `components/portal/FormField.tsx`:
```tsx
export function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
  error,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  step?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-navy block mb-2">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={Boolean(error)}
        className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm text-slate-ink focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
      />
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
```

Create `components/portal/FormSelect.tsx`:
```tsx
export function FormSelect({
  label,
  name,
  options,
  defaultValue,
  required,
  error,
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-navy block mb-2">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm text-slate-ink focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
```

Create `components/portal/DataTable.tsx`:
```tsx
import { ReactNode } from "react";

export function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: ReactNode[];
  rows: ReactNode[][];
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-border-soft bg-surface p-8 text-center text-sm text-muted">
        {empty ?? "No data."}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border-soft bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-navy/70">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-bg/50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-slate-ink align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Worker server actions `lib/actions/workers.ts`**

```ts
"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Role, Locale } from "@prisma/client";

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1),
  role: z.enum(["ADMIN", "WORKER"]),
  language: z.enum(["EN", "SK"]),
  password: z.string().min(8),
});

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

export async function createWorkerAction(fd: FormData): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = createSchema.safeParse({
    email: fd.get("email"),
    name: fd.get("name"),
    role: fd.get("role"),
    language: fd.get("language"),
    password: fd.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: zErrors(parsed.error.issues) };
  }
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { ok: false, error: "validation", fieldErrors: { email: "Email already in use" } };
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role as Role,
      language: parsed.data.language as Locale,
      passwordHash,
    },
  });
  revalidatePath("/workers");
  return { ok: true, data: { id: user.id } };
}

const updateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(1),
  role: z.enum(["ADMIN", "WORKER"]),
  language: z.enum(["EN", "SK"]),
  active: z.coerce.boolean(),
});

export async function updateWorkerAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateSchema.safeParse({
    userId: fd.get("userId"),
    name: fd.get("name"),
    role: fd.get("role"),
    language: fd.get("language"),
    active: fd.get("active") === "on" || fd.get("active") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: zErrors(parsed.error.issues) };
  }
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      name: parsed.data.name,
      role: parsed.data.role as Role,
      language: parsed.data.language as Locale,
      active: parsed.data.active,
    },
  });
  revalidatePath("/workers");
  revalidatePath(`/workers/${parsed.data.userId}`);
  return { ok: true };
}

export async function resetPasswordAction(fd: FormData): Promise<ActionResult<{ tempPassword: string }>> {
  await requireAdmin();
  const userId = String(fd.get("userId") ?? "");
  if (!userId) return { ok: false, error: "validation" };
  const tempPassword = `qs-${Math.random().toString(36).slice(2, 10)}`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath(`/workers/${userId}`);
  return { ok: true, data: { tempPassword } };
}
```

- [ ] **Step 3: Workers list `app/(app)/workers/page.tsx`**

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";

export default async function WorkersListPage() {
  await requireAdmin();
  const t = await getTranslations("workers");
  const tCommon = await getTranslations("common");
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-navy">{t("list")}</h1>
        <Button href="/workers/new" variant="primary">{t("new")}</Button>
      </div>
      <DataTable
        headers={[tCommon("name"), tCommon("email"), t("role"), tCommon("status"), tCommon("actions")]}
        rows={users.map((u) => [
          u.name,
          u.email,
          u.role === "ADMIN" ? t("admin") : t("worker"),
          u.active ? tCommon("active") : tCommon("closed"),
          <Link key={u.id} href={`/workers/${u.id}`} className="text-navy underline">
            {tCommon("edit")}
          </Link>,
        ])}
      />
    </div>
  );
}
```

- [ ] **Step 4: New worker `app/(app)/workers/new/page.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { FormSelect } from "@/components/portal/FormSelect";
import { createWorkerAction } from "@/lib/actions/workers";

export default function NewWorkerPage() {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await createWorkerAction(fd);
      if (r.ok) router.push("/workers");
      else setErrors(r.fieldErrors ?? {});
    });
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("new")}</h1>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField label={tCommon("email")} name="email" type="email" required error={errors.email} />
        <FormField label={tCommon("name")} name="name" required error={errors.name} />
        <FormSelect
          label={t("role")}
          name="role"
          defaultValue="WORKER"
          required
          options={[
            { value: "WORKER", label: t("worker") },
            { value: "ADMIN", label: t("admin") },
          ]}
          error={errors.role}
        />
        <FormSelect
          label={tCommon("language")}
          name="language"
          defaultValue="EN"
          required
          options={[
            { value: "EN", label: "English" },
            { value: "SK", label: "Slovenčina" },
          ]}
          error={errors.language}
        />
        <FormField
          label={tCommon("password")}
          name="password"
          type="password"
          required
          hint="Min 8 characters"
          error={errors.password}
        />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? tCommon("loading") : tCommon("create")}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Edit worker `app/(app)/workers/[userId]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { EditWorkerForm } from "./EditWorkerForm";

export default async function EditWorkerPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();
  const t = await getTranslations("workers");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-navy mb-2">{user.name}</h1>
      <p className="text-sm text-muted mb-8">{user.email}</p>
      <EditWorkerForm
        user={{
          id: user.id,
          name: user.name,
          role: user.role,
          language: user.language,
          active: user.active,
        }}
      />
    </div>
  );
}
```

Create the client form `app/(app)/workers/[userId]/EditWorkerForm.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { FormSelect } from "@/components/portal/FormSelect";
import { updateWorkerAction, resetPasswordAction } from "@/lib/actions/workers";

export function EditWorkerForm({
  user,
}: {
  user: {
    id: string;
    name: string;
    role: "ADMIN" | "WORKER";
    language: "EN" | "SK";
    active: boolean;
  };
}) {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    fd.set("userId", user.id);
    start(async () => {
      const r = await updateWorkerAction(fd);
      if (r.ok) router.refresh();
      else setErrors(r.fieldErrors ?? {});
    });
  }

  function onResetPassword() {
    const fd = new FormData();
    fd.set("userId", user.id);
    start(async () => {
      const r = await resetPasswordAction(fd);
      if (r.ok && r.data) setTempPassword(r.data.tempPassword);
    });
  }

  return (
    <>
      <form onSubmit={onSave} className="space-y-5" noValidate>
        <FormField label={tCommon("name")} name="name" defaultValue={user.name} required error={errors.name} />
        <FormSelect
          label={t("role")}
          name="role"
          defaultValue={user.role}
          required
          options={[
            { value: "WORKER", label: t("worker") },
            { value: "ADMIN", label: t("admin") },
          ]}
          error={errors.role}
        />
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
          <input type="checkbox" name="active" defaultChecked={user.active} />
          {tCommon("active")}
        </label>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? tCommon("loading") : tCommon("save")}
        </Button>
      </form>

      <div className="mt-10 pt-6 border-t border-border-soft">
        <Button onClick={onResetPassword} variant="secondary" disabled={pending}>
          {t("resetPassword")}
        </Button>
        {tempPassword && (
          <p className="mt-3 text-sm text-navy">
            {t("tempPassword", { password: tempPassword })}
          </p>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 6: Build + commit**

```powershell
npm run build
```
Expected: success.

```powershell
git add lib/actions/workers.ts components/portal/FormField.tsx components/portal/FormSelect.tsx components/portal/DataTable.tsx app/\(app\)/workers
git commit -m "feat: workers admin CRUD"
```

---

## Task 11: Projects admin — list, create, project editor (sections + tables)

**Files:**
- Create: `lib/actions/projects.ts`
- Create: `app/(app)/projects/page.tsx`
- Create: `app/(app)/projects/new/page.tsx`
- Create: `app/(app)/projects/[projectId]/page.tsx`
- Create: `app/(app)/projects/[projectId]/edit/page.tsx`
- Create: `app/(app)/projects/[projectId]/edit/SectionsEditor.tsx`

- [ ] **Step 1: Server actions `lib/actions/projects.ts`**

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { ProjectStatus } from "@prisma/client";
import { computeModules } from "@/lib/portal/modules";

const createSchema = z.object({
  name: z.string().trim().min(1),
  location: z.string().trim().optional(),
});

export async function createProjectAction(fd: FormData) {
  await requireAdmin();
  const parsed = createSchema.safeParse({
    name: fd.get("name"),
    location: fd.get("location") || undefined,
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };
  const p = await prisma.project.create({
    data: { name: parsed.data.name, location: parsed.data.location ?? null },
  });
  revalidatePath("/projects");
  return { ok: true as const, data: { id: p.id } };
}

export async function updateProjectAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("projectId") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const location = String(fd.get("location") ?? "").trim() || null;
  if (!id || !name) return { ok: false as const, error: "validation" };
  await prisma.project.update({ where: { id }, data: { name, location } });
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/edit`);
  return { ok: true as const };
}

export async function setProjectStatusAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("projectId") ?? "");
  const status = String(fd.get("status") ?? "");
  if (!id || (status !== "ACTIVE" && status !== "CLOSED")) {
    return { ok: false as const, error: "validation" };
  }
  await prisma.project.update({
    where: { id },
    data: {
      status: status as ProjectStatus,
      closedAt: status === "CLOSED" ? new Date() : null,
    },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { ok: true as const };
}

const sectionSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1),
});

export async function createSectionAction(fd: FormData) {
  await requireAdmin();
  const parsed = sectionSchema.safeParse({
    projectId: fd.get("projectId"),
    name: fd.get("name"),
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };
  const count = await prisma.section.count({ where: { projectId: parsed.data.projectId } });
  await prisma.section.create({
    data: {
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      orderIndex: count,
    },
  });
  revalidatePath(`/projects/${parsed.data.projectId}/edit`);
  return { ok: true as const };
}

export async function deleteSectionAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("sectionId") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  if (!id) return { ok: false as const, error: "validation" };
  await prisma.section.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true as const };
}

const tableSchema = z.object({
  sectionId: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().trim().min(1),
  rows: z.coerce.number().int().positive(),
  cols: z.coerce.number().int().positive(),
  skipped: z.coerce.number().int().min(0).default(0),
});

export async function createTableAction(fd: FormData) {
  await requireAdmin();
  const parsed = tableSchema.safeParse({
    sectionId: fd.get("sectionId"),
    projectId: fd.get("projectId"),
    name: fd.get("name"),
    rows: fd.get("rows"),
    cols: fd.get("cols"),
    skipped: fd.get("skipped") || 0,
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };
  try {
    computeModules({
      rows: parsed.data.rows,
      cols: parsed.data.cols,
      skipped: parsed.data.skipped,
    });
  } catch {
    return { ok: false as const, error: "validation" };
  }
  const count = await prisma.table.count({ where: { sectionId: parsed.data.sectionId } });
  await prisma.table.create({
    data: {
      sectionId: parsed.data.sectionId,
      name: parsed.data.name,
      rows: parsed.data.rows,
      cols: parsed.data.cols,
      skipped: parsed.data.skipped,
      orderIndex: count,
    },
  });
  revalidatePath(`/projects/${parsed.data.projectId}/edit`);
  return { ok: true as const };
}

export async function deleteTableAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("tableId") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  if (!id) return { ok: false as const, error: "validation" };
  await prisma.table.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true as const };
}
```

- [ ] **Step 2: Projects list `app/(app)/projects/page.tsx`**

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";
import { computeModules } from "@/lib/portal/modules";

export default async function ProjectsListPage() {
  await requireAdmin();
  const t = await getTranslations("projects");
  const tCommon = await getTranslations("common");

  const projects = await prisma.project.findMany({
    include: {
      sections: { include: { tables: { include: { activityLogs: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-navy">{t("list")}</h1>
        <Button href="/projects/new" variant="primary">{t("new")}</Button>
      </div>
      <DataTable
        headers={[tCommon("name"), "Location", t("modules"), tCommon("status"), tCommon("actions")]}
        empty={t("noProjects")}
        rows={projects.map((p) => {
          let total = 0, tied = 0, connected = 0;
          for (const s of p.sections)
            for (const tbl of s.tables) {
              total += computeModules({ rows: tbl.rows, cols: tbl.cols, skipped: tbl.skipped });
              for (const a of tbl.activityLogs) {
                if (a.action === "TIE") tied += a.count;
                else connected += a.count;
              }
            }
          return [
            <Link key="n" href={`/projects/${p.id}`} className="text-navy underline">{p.name}</Link>,
            p.location ?? "—",
            `${tied}/${total} · ${connected}/${total}`,
            p.status === "ACTIVE" ? tCommon("active") : tCommon("closed"),
            <Link key="e" href={`/projects/${p.id}/edit`} className="text-navy underline">{tCommon("edit")}</Link>,
          ];
        })}
      />
    </div>
  );
}
```

- [ ] **Step 3: New project `app/(app)/projects/new/page.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { createProjectAction } from "@/lib/actions/projects";

export default function NewProjectPage() {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await createProjectAction(fd);
      if (r.ok && r.data) router.push(`/projects/${r.data.id}/edit`);
      else setError("validation");
    });
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("new")}</h1>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField label={t("name")} name="name" required error={error ?? undefined} />
        <FormField label={t("location")} name="location" />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? tCommon("loading") : tCommon("create")}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Project overview `app/(app)/projects/[projectId]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { computeModules } from "@/lib/portal/modules";
import { Button } from "@/components/ui/Button";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const tCommon = await getTranslations("common");
  const t = await getTranslations("projects");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: {
          tables: {
            orderBy: { orderIndex: "asc" },
            include: { activityLogs: true },
          },
        },
      },
      projectWorkers: { include: { user: true } },
    },
  });
  if (!project) notFound();

  // Workers can only view projects they're assigned to
  if (user.role !== "ADMIN" && !project.projectWorkers.find((pw) => pw.userId === user.id)) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{project.name}</h1>
          {project.location && <p className="text-sm text-muted">{project.location}</p>}
        </div>
        <div className="flex gap-2">
          {user.role === "ADMIN" && (
            <Button href={`/projects/${project.id}/edit`} variant="secondary">{tCommon("edit")}</Button>
          )}
          <Button href={`/projects/${project.id}/log`} variant="primary">Log work</Button>
        </div>
      </div>

      {project.sections.map((s) => (
        <section key={s.id} className="mb-8">
          <h2 className="text-lg font-semibold text-navy mb-3">{s.name}</h2>
          <div className="rounded-md border border-border-soft bg-surface divide-y divide-border-soft">
            {s.tables.map((tbl) => {
              const total = computeModules({ rows: tbl.rows, cols: tbl.cols, skipped: tbl.skipped });
              const tied = tbl.activityLogs.filter((l) => l.action === "TIE").reduce((a, b) => a + b.count, 0);
              const connected = tbl.activityLogs.filter((l) => l.action === "CONNECT").reduce((a, b) => a + b.count, 0);
              return (
                <div key={tbl.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-navy">{tbl.name}</div>
                    <div className="text-xs text-muted">{tbl.rows}×{tbl.cols} − {tbl.skipped} = {total} {t("modules").toLowerCase()}</div>
                  </div>
                  <div className="text-xs text-slate-ink">
                    {tied}/{total} {t("tied").toLowerCase()} · {connected}/{total} {t("connected").toLowerCase()}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Project editor `app/(app)/projects/[projectId]/edit/page.tsx` + client component**

`page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { SectionsEditor } from "./SectionsEditor";
import { computeModules } from "@/lib/portal/modules";

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireAdmin();
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: { tables: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });
  if (!project) notFound();
  const t = await getTranslations("projects");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{project.name}</h1>
      <SectionsEditor
        projectId={project.id}
        sections={project.sections.map((s) => ({
          id: s.id,
          name: s.name,
          tables: s.tables.map((t) => ({
            id: t.id,
            name: t.name,
            rows: t.rows,
            cols: t.cols,
            skipped: t.skipped,
            modules: computeModules({ rows: t.rows, cols: t.cols, skipped: t.skipped }),
          })),
        }))}
        labels={{
          section: t("section"),
          newSection: t("newSection"),
          table: t("table"),
          newTable: t("newTable"),
          rows: t("rows"),
          cols: t("cols"),
          skipped: t("skipped"),
          modules: t("modules"),
        }}
      />
    </div>
  );
}
```

`SectionsEditor.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import {
  createSectionAction,
  deleteSectionAction,
  createTableAction,
  deleteTableAction,
} from "@/lib/actions/projects";

type Table = { id: string; name: string; rows: number; cols: number; skipped: number; modules: number };
type Section = { id: string; name: string; tables: Table[] };

export function SectionsEditor({
  projectId,
  sections,
  labels,
}: {
  projectId: string;
  sections: Section[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [newSectionName, setNewSectionName] = useState("");

  function addSection() {
    if (!newSectionName.trim()) return;
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("name", newSectionName.trim());
    start(async () => {
      await createSectionAction(fd);
      setNewSectionName("");
      router.refresh();
    });
  }

  function removeSection(sectionId: string) {
    const fd = new FormData();
    fd.set("sectionId", sectionId);
    fd.set("projectId", projectId);
    start(async () => {
      await deleteSectionAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-2 max-w-md">
        <input
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          placeholder={labels.section}
          className="flex-1 rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
        />
        <Button onClick={addSection} variant="primary" disabled={pending}>
          {labels.newSection}
        </Button>
      </div>

      {sections.map((s) => (
        <div key={s.id} className="rounded-md border border-border-soft bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy">{s.name}</h2>
            <button
              onClick={() => removeSection(s.id)}
              disabled={pending}
              className="text-xs text-red-600 hover:underline"
            >
              {tCommon("delete")}
            </button>
          </div>

          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-navy/60">
                <th className="py-2">{labels.table}</th>
                <th className="py-2">{labels.rows}</th>
                <th className="py-2">{labels.cols}</th>
                <th className="py-2">{labels.skipped}</th>
                <th className="py-2">{labels.modules}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {s.tables.map((t) => (
                <tr key={t.id} className="border-t border-border-soft">
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{t.rows}</td>
                  <td className="py-2">{t.cols}</td>
                  <td className="py-2">{t.skipped}</td>
                  <td className="py-2">{t.modules}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("tableId", t.id);
                        fd.set("projectId", projectId);
                        start(async () => {
                          await deleteTableAction(fd);
                          router.refresh();
                        });
                      }}
                      disabled={pending}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {tCommon("delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <NewTableRow projectId={projectId} sectionId={s.id} labels={labels} pending={pending} startTransition={start} />
        </div>
      ))}
    </div>
  );
}

function NewTableRow({
  projectId,
  sectionId,
  labels,
  pending,
  startTransition,
}: {
  projectId: string;
  sectionId: string;
  labels: Record<string, string>;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [rows, setRows] = useState("");
  const [cols, setCols] = useState("");
  const [skipped, setSkipped] = useState("0");

  function add() {
    const fd = new FormData();
    fd.set("sectionId", sectionId);
    fd.set("projectId", projectId);
    fd.set("name", name.trim());
    fd.set("rows", rows);
    fd.set("cols", cols);
    fd.set("skipped", skipped || "0");
    startTransition(async () => {
      const r = await createTableAction(fd);
      if (r.ok) {
        setName("");
        setRows("");
        setCols("");
        setSkipped("0");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid grid-cols-6 gap-2 items-center">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.table} className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm" />
      <input value={rows} onChange={(e) => setRows(e.target.value)} type="number" min="1" placeholder={labels.rows} className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm" />
      <input value={cols} onChange={(e) => setCols(e.target.value)} type="number" min="1" placeholder={labels.cols} className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm" />
      <input value={skipped} onChange={(e) => setSkipped(e.target.value)} type="number" min="0" placeholder={labels.skipped} className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm" />
      <div className="text-sm text-muted">
        = {Number(rows) > 0 && Number(cols) > 0 ? Math.max(0, Number(rows) * Number(cols) - Number(skipped || 0)) : "—"}
      </div>
      <Button onClick={add} variant="primary" disabled={pending || !name.trim() || !rows || !cols}>
        {labels.newTable}
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Build + commit**

```powershell
npm run build
```
```powershell
git add lib/actions/projects.ts app/\(app\)/projects
git commit -m "feat: projects admin (list, create, sections + tables editor)"
```

---

## Task 12: Project workers (assignments + prices)

**Files:**
- Create: `lib/actions/project-workers.ts`
- Modify: `app/(app)/projects/[projectId]/edit/page.tsx` (add WorkersPanel)
- Create: `app/(app)/projects/[projectId]/edit/WorkersPanel.tsx`

- [ ] **Step 1: Server actions `lib/actions/project-workers.ts`**

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";

const assignSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  priceTie: z.coerce.number().nonnegative(),
  priceConnect: z.coerce.number().nonnegative(),
});

export async function assignWorkerAction(fd: FormData) {
  await requireAdmin();
  const parsed = assignSchema.safeParse({
    projectId: fd.get("projectId"),
    userId: fd.get("userId"),
    priceTie: fd.get("priceTie"),
    priceConnect: fd.get("priceConnect"),
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };
  await prisma.projectWorker.upsert({
    where: { projectId_userId: { projectId: parsed.data.projectId, userId: parsed.data.userId } },
    update: { priceTie: parsed.data.priceTie, priceConnect: parsed.data.priceConnect },
    create: parsed.data,
  });
  revalidatePath(`/projects/${parsed.data.projectId}/edit`);
  return { ok: true as const };
}

export async function removeAssignmentAction(fd: FormData) {
  await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const userId = String(fd.get("userId") ?? "");
  if (!projectId || !userId) return { ok: false as const, error: "validation" };
  await prisma.projectWorker.delete({
    where: { projectId_userId: { projectId, userId } },
  });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true as const };
}
```

- [ ] **Step 2: Update edit page to load workers + render `WorkersPanel`**

Modify `app/(app)/projects/[projectId]/edit/page.tsx` — replace the existing query and render to include workers:

```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { SectionsEditor } from "./SectionsEditor";
import { WorkersPanel } from "./WorkersPanel";
import { computeModules } from "@/lib/portal/modules";

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireAdmin();
  const { projectId } = await params;

  const [project, allWorkers] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: { orderBy: { orderIndex: "asc" }, include: { tables: { orderBy: { orderIndex: "asc" } } } },
        projectWorkers: { include: { user: true } },
      },
    }),
    prisma.user.findMany({ where: { active: true, role: "WORKER" }, orderBy: { name: "asc" } }),
  ]);
  if (!project) notFound();
  const t = await getTranslations("projects");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{project.name}</h1>
      <SectionsEditor
        projectId={project.id}
        sections={project.sections.map((s) => ({
          id: s.id,
          name: s.name,
          tables: s.tables.map((tb) => ({
            id: tb.id,
            name: tb.name,
            rows: tb.rows,
            cols: tb.cols,
            skipped: tb.skipped,
            modules: computeModules({ rows: tb.rows, cols: tb.cols, skipped: tb.skipped }),
          })),
        }))}
        labels={{
          section: t("section"),
          newSection: t("newSection"),
          table: t("table"),
          newTable: t("newTable"),
          rows: t("rows"),
          cols: t("cols"),
          skipped: t("skipped"),
          modules: t("modules"),
        }}
      />

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-navy mb-4">{t("assignedWorkers")}</h2>
        <WorkersPanel
          projectId={project.id}
          assigned={project.projectWorkers.map((pw) => ({
            userId: pw.userId,
            name: pw.user.name,
            email: pw.user.email,
            priceTie: Number(pw.priceTie),
            priceConnect: Number(pw.priceConnect),
          }))}
          available={allWorkers
            .filter((u) => !project.projectWorkers.find((pw) => pw.userId === u.id))
            .map((u) => ({ id: u.id, name: u.name, email: u.email }))}
          labels={{
            assignWorker: t("assignWorker"),
            priceTie: t("priceTie"),
            priceConnect: t("priceConnect"),
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `WorkersPanel.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { assignWorkerAction, removeAssignmentAction } from "@/lib/actions/project-workers";

export function WorkersPanel({
  projectId,
  assigned,
  available,
  labels,
}: {
  projectId: string;
  assigned: { userId: string; name: string; email: string; priceTie: number; priceConnect: number }[];
  available: { id: string; name: string; email: string }[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState("");
  const [priceTie, setPriceTie] = useState("");
  const [priceConnect, setPriceConnect] = useState("");

  function assign() {
    if (!selected) return;
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("userId", selected);
    fd.set("priceTie", priceTie || "0");
    fd.set("priceConnect", priceConnect || "0");
    start(async () => {
      await assignWorkerAction(fd);
      setSelected("");
      setPriceTie("");
      setPriceConnect("");
      router.refresh();
    });
  }

  function remove(userId: string) {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("userId", userId);
    start(async () => {
      await removeAssignmentAction(fd);
      router.refresh();
    });
  }

  function updatePrice(userId: string, priceTie: string, priceConnect: string) {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("userId", userId);
    fd.set("priceTie", priceTie);
    fd.set("priceConnect", priceConnect);
    start(async () => {
      await assignWorkerAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border-soft bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-navy/60">
              <th className="px-4 py-3">{tCommon("name")}</th>
              <th className="px-4 py-3">{labels.priceTie}</th>
              <th className="px-4 py-3">{labels.priceConnect}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {assigned.map((pw) => (
              <AssignedRow key={pw.userId} pw={pw} onChange={updatePrice} onRemove={remove} pending={pending} />
            ))}
          </tbody>
        </table>
      </div>

      {available.length > 0 && (
        <div className="grid grid-cols-4 gap-2 items-end max-w-3xl">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          >
            <option value="">— {labels.assignWorker} —</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <input
            value={priceTie}
            onChange={(e) => setPriceTie(e.target.value)}
            type="number"
            step="0.01"
            placeholder={labels.priceTie}
            className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          />
          <input
            value={priceConnect}
            onChange={(e) => setPriceConnect(e.target.value)}
            type="number"
            step="0.01"
            placeholder={labels.priceConnect}
            className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
          />
          <Button onClick={assign} variant="primary" disabled={pending || !selected}>
            {labels.assignWorker}
          </Button>
        </div>
      )}
    </div>
  );
}

function AssignedRow({
  pw,
  onChange,
  onRemove,
  pending,
}: {
  pw: { userId: string; name: string; email: string; priceTie: number; priceConnect: number };
  onChange: (id: string, t: string, c: string) => void;
  onRemove: (id: string) => void;
  pending: boolean;
}) {
  const tCommon = useTranslations("common");
  const [t, setT] = useState(String(pw.priceTie));
  const [c, setC] = useState(String(pw.priceConnect));
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-semibold text-navy">{pw.name}</div>
        <div className="text-xs text-muted">{pw.email}</div>
      </td>
      <td className="px-4 py-3">
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          onBlur={() => onChange(pw.userId, t, c)}
          type="number"
          step="0.01"
          className="w-24 rounded-md border border-border-soft bg-bg px-2 py-1 text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <input
          value={c}
          onChange={(e) => setC(e.target.value)}
          onBlur={() => onChange(pw.userId, t, c)}
          type="number"
          step="0.01"
          className="w-24 rounded-md border border-border-soft bg-bg px-2 py-1 text-sm"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => onRemove(pw.userId)} disabled={pending} className="text-xs text-red-600 hover:underline">
          {tCommon("delete")}
        </button>
      </td>
    </tr>
  );
}
```

- [ ] **Step 4: Build + commit**

```powershell
npm run build
git add lib/actions/project-workers.ts "app/(app)/projects/[projectId]/edit"
git commit -m "feat: project workers + per-action prices"
```

---

## Task 13: Worker logging UI

**Files:**
- Create: `lib/actions/activity.ts`
- Create: `app/(app)/dashboard/page.tsx`
- Create: `app/(app)/projects/[projectId]/log/page.tsx`
- Create: `app/(app)/projects/[projectId]/log/TableLogger.tsx`

- [ ] **Step 1: Activity server actions `lib/actions/activity.ts`**

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { checkOverCap } from "@/lib/portal/over-cap";
import { computeModules } from "@/lib/portal/modules";

const logSchema = z.object({
  tableId: z.string().min(1),
  action: z.enum(["TIE", "CONNECT"]),
  count: z.coerce.number().int().positive(),
  workDate: z.string().min(1),
  notes: z.string().optional(),
});

export type LogResult =
  | { ok: true }
  | { ok: false; error: "validation" | "over-cap" | "not-assigned" | "closed"; remaining?: number };

export async function logActivityAction(fd: FormData): Promise<LogResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "validation" };

  const parsed = logSchema.safeParse({
    tableId: fd.get("tableId"),
    action: fd.get("action"),
    count: fd.get("count"),
    workDate: fd.get("workDate"),
    notes: fd.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "validation" };

  const table = await prisma.table.findUnique({
    where: { id: parsed.data.tableId },
    include: {
      section: { include: { project: true } },
      activityLogs: { where: { action: parsed.data.action } },
    },
  });
  if (!table) return { ok: false, error: "validation" };
  if (table.section.project.status === "CLOSED") return { ok: false, error: "closed" };

  const pw = await prisma.projectWorker.findUnique({
    where: {
      projectId_userId: {
        projectId: table.section.projectId,
        userId: session.user.id,
      },
    },
  });
  if (!pw) return { ok: false, error: "not-assigned" };

  const totalModules = computeModules({ rows: table.rows, cols: table.cols, skipped: table.skipped });
  const existing = table.activityLogs.reduce((a, b) => a + b.count, 0);

  const check = checkOverCap({
    totalModules,
    existing,
    requested: parsed.data.count,
    action: parsed.data.action,
  });
  if (!check.ok) {
    return { ok: false, error: "over-cap", remaining: check.remaining };
  }

  await prisma.activityLog.create({
    data: {
      projectWorkerId: pw.id,
      tableId: parsed.data.tableId,
      action: parsed.data.action,
      count: parsed.data.count,
      workDate: new Date(parsed.data.workDate),
      notes: parsed.data.notes ?? null,
    },
  });

  revalidatePath(`/projects/${table.section.projectId}/log`);
  revalidatePath(`/projects/${table.section.projectId}`);
  return { ok: true };
}

const updateSchema = z.object({
  logId: z.string().min(1),
  count: z.coerce.number().int().positive(),
});

export async function updateLogAction(fd: FormData): Promise<LogResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "validation" };
  const parsed = updateSchema.safeParse({ logId: fd.get("logId"), count: fd.get("count") });
  if (!parsed.success) return { ok: false, error: "validation" };

  const log = await prisma.activityLog.findUnique({
    where: { id: parsed.data.logId },
    include: {
      table: {
        include: {
          section: { include: { project: true } },
          activityLogs: true,
        },
      },
      projectWorker: true,
    },
  });
  if (!log) return { ok: false, error: "validation" };

  const isOwn = log.projectWorker.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const ageMs = Date.now() - log.createdAt.getTime();
  const withinWindow = ageMs < 24 * 60 * 60 * 1000;
  if (!isAdmin && !(isOwn && withinWindow)) return { ok: false, error: "validation" };

  const total = computeModules({ rows: log.table.rows, cols: log.table.cols, skipped: log.table.skipped });
  const otherCount = log.table.activityLogs
    .filter((l) => l.action === log.action && l.id !== log.id)
    .reduce((a, b) => a + b.count, 0);

  if (otherCount + parsed.data.count > total) {
    return { ok: false, error: "over-cap", remaining: Math.max(0, total - otherCount) };
  }

  await prisma.activityLog.update({
    where: { id: parsed.data.logId },
    data: { count: parsed.data.count },
  });
  revalidatePath(`/projects/${log.table.section.projectId}/log`);
  return { ok: true };
}

export async function deleteLogAction(fd: FormData): Promise<LogResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "validation" };
  const logId = String(fd.get("logId") ?? "");
  const log = await prisma.activityLog.findUnique({
    where: { id: logId },
    include: { projectWorker: true, table: { include: { section: true } } },
  });
  if (!log) return { ok: false, error: "validation" };
  const isOwn = log.projectWorker.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const withinWindow = Date.now() - log.createdAt.getTime() < 24 * 60 * 60 * 1000;
  if (!isAdmin && !(isOwn && withinWindow)) return { ok: false, error: "validation" };

  await prisma.activityLog.delete({ where: { id: logId } });
  revalidatePath(`/projects/${log.table.section.projectId}/log`);
  return { ok: true };
}
```

- [ ] **Step 2: Worker dashboard `app/(app)/dashboard/page.tsx`**

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { Card } from "@/components/ui/Card";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("nav");

  const assignments =
    user.role === "ADMIN"
      ? await prisma.project.findMany({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        })
      : (
          await prisma.projectWorker.findMany({
            where: { userId: user.id, project: { status: "ACTIVE" } },
            include: { project: true },
            orderBy: { project: { createdAt: "desc" } },
          })
        ).map((pw) => pw.project);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("dashboard")}</h1>
      {assignments.length === 0 ? (
        <p className="text-sm text-muted">No active projects.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}/log`}>
              <Card>
                <h2 className="text-lg font-semibold text-navy">{p.name}</h2>
                {p.location && <p className="text-sm text-muted">{p.location}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Log page server component**

`app/(app)/projects/[projectId]/log/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/portal/session";
import { computeModules } from "@/lib/portal/modules";
import { TableLogger } from "./TableLogger";

export default async function LogPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const t = await getTranslations("log");
  const tProj = await getTranslations("projects");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: {
          tables: {
            orderBy: { orderIndex: "asc" },
            include: { activityLogs: { orderBy: { createdAt: "desc" } } },
          },
        },
      },
      projectWorkers: { where: { userId: user.id } },
    },
  });
  if (!project) notFound();
  if (user.role !== "ADMIN" && project.projectWorkers.length === 0) notFound();

  const projectWorkerId = project.projectWorkers[0]?.id ?? null;
  const isClosed = project.status === "CLOSED";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-1">{project.name}</h1>
      <p className="text-sm text-muted mb-8">{t("title")}</p>

      {project.sections.map((s) => (
        <section key={s.id} className="mb-8">
          <h2 className="text-lg font-semibold text-navy mb-3">{s.name}</h2>
          <div className="space-y-4">
            {s.tables.map((tbl) => {
              const total = computeModules({ rows: tbl.rows, cols: tbl.cols, skipped: tbl.skipped });
              const tied = tbl.activityLogs.filter((l) => l.action === "TIE").reduce((a, b) => a + b.count, 0);
              const connected = tbl.activityLogs.filter((l) => l.action === "CONNECT").reduce((a, b) => a + b.count, 0);

              return (
                <TableLogger
                  key={tbl.id}
                  table={{ id: tbl.id, name: tbl.name, total, tied, connected }}
                  myLogs={
                    projectWorkerId
                      ? tbl.activityLogs
                          .filter((l) => l.projectWorkerId === projectWorkerId)
                          .slice(0, 5)
                          .map((l) => ({
                            id: l.id,
                            action: l.action,
                            count: l.count,
                            workDate: l.workDate.toISOString().slice(0, 10),
                            createdAt: l.createdAt.toISOString(),
                          }))
                      : []
                  }
                  isClosed={isClosed}
                  isAdmin={user.role === "ADMIN"}
                  canSubmit={Boolean(projectWorkerId) && !isClosed}
                  labels={{
                    iTied: t("iTied"),
                    iConnected: t("iConnected"),
                    workDate: t("workDate"),
                    submit: t("submit"),
                    progress: t("tableProgress", { tied, connected, total }),
                    recent: t("recentEntries"),
                    locked: t("editWindowOver"),
                    overCap: t("overCap", { remaining: "{r}" }),
                    tied: tProj("tied"),
                    connected: tProj("connected"),
                  }}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: `TableLogger.tsx` (client)**

`app/(app)/projects/[projectId]/log/TableLogger.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  logActivityAction,
  updateLogAction,
  deleteLogAction,
} from "@/lib/actions/activity";

export function TableLogger({
  table,
  myLogs,
  isClosed,
  isAdmin,
  canSubmit,
  labels,
}: {
  table: { id: string; name: string; total: number; tied: number; connected: number };
  myLogs: { id: string; action: "TIE" | "CONNECT"; count: number; workDate: string; createdAt: string }[];
  isClosed: boolean;
  isAdmin: boolean;
  canSubmit: boolean;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [tieCount, setTieCount] = useState("");
  const [connectCount, setConnectCount] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  function submit(action: "TIE" | "CONNECT") {
    const fd = new FormData();
    fd.set("tableId", table.id);
    fd.set("action", action);
    fd.set("count", action === "TIE" ? tieCount : connectCount);
    fd.set("workDate", workDate);
    setError(null);
    start(async () => {
      const r = await logActivityAction(fd);
      if (r.ok) {
        if (action === "TIE") setTieCount("");
        else setConnectCount("");
        router.refresh();
      } else if (r.error === "over-cap") {
        setError(labels.overCap.replace("{r}", String(r.remaining ?? 0)));
      } else if (r.error === "not-assigned") {
        setError("Not assigned to this project.");
      } else if (r.error === "closed") {
        setError("Project is closed.");
      } else {
        setError(tCommon("save"));
      }
    });
  }

  function remove(logId: string) {
    const fd = new FormData();
    fd.set("logId", logId);
    start(async () => {
      await deleteLogAction(fd);
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-navy">{table.name}</h3>
        <div className="text-xs text-muted">{labels.progress}</div>
      </div>

      {canSubmit && (
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] mb-3">
          <div>
            <label className="text-xs text-muted block mb-1">{labels.iTied}</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={tieCount}
                onChange={(e) => setTieCount(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-bg px-3 py-2 text-sm"
              />
              <Button onClick={() => submit("TIE")} variant="primary" disabled={pending || !tieCount}>
                +
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">{labels.iConnected}</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={connectCount}
                onChange={(e) => setConnectCount(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-bg px-3 py-2 text-sm"
              />
              <Button onClick={() => submit("CONNECT")} variant="primary" disabled={pending || !connectCount}>
                +
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">{labels.workDate}</label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mb-2" role="alert">{error}</p>}

      {myLogs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border-soft">
          <div className="text-xs uppercase tracking-wide text-navy/60 mb-2">{labels.recent}</div>
          <ul className="text-sm space-y-1">
            {myLogs.map((l) => {
              const ageMs = Date.now() - new Date(l.createdAt).getTime();
              const locked = !isAdmin && ageMs >= 24 * 60 * 60 * 1000;
              return (
                <li key={l.id} className="flex items-center justify-between text-slate-ink">
                  <span>
                    <span className="font-semibold text-navy">{l.count}</span>{" "}
                    {l.action === "TIE" ? labels.tied : labels.connected}{" "}
                    <span className="text-muted">· {l.workDate}</span>
                  </span>
                  {!locked && (
                    <button
                      onClick={() => remove(l.id)}
                      disabled={pending}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {tCommon("delete")}
                    </button>
                  )}
                  {locked && <span className="text-xs text-muted">{labels.locked}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 5: Build + commit**

```powershell
npm run build
git add lib/actions/activity.ts "app/(app)/dashboard" "app/(app)/projects/[projectId]/log"
git commit -m "feat: worker dashboard + activity logging UI"
```

---

## Task 14: Accommodations admin

**Files:**
- Create: `lib/actions/accommodations.ts`
- Create: `app/(app)/accommodations/page.tsx`
- Create: `app/(app)/accommodations/new/page.tsx`
- Create: `app/(app)/accommodations/[id]/page.tsx`
- Create: `app/(app)/accommodations/AccommodationForm.tsx`

- [ ] **Step 1: Server actions `lib/actions/accommodations.ts`**

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Currency } from "@prisma/client";

const schema = z.object({
  id: z.string().optional(),
  projectId: z.string().optional().nullable(),
  name: z.string().trim().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  totalCost: z.coerce.number().nonnegative(),
  currency: z.enum(["USD", "EUR"]),
  notes: z.string().optional(),
  workerIds: z.array(z.string()).default([]),
});

export async function saveAccommodationAction(fd: FormData) {
  await requireAdmin();
  const parsed = schema.safeParse({
    id: fd.get("id") || undefined,
    projectId: fd.get("projectId") || null,
    name: fd.get("name"),
    startDate: fd.get("startDate"),
    endDate: fd.get("endDate"),
    totalCost: fd.get("totalCost"),
    currency: fd.get("currency") || "USD",
    notes: fd.get("notes") || undefined,
    workerIds: fd.getAll("workerIds").map(String),
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };

  const data = {
    projectId: parsed.data.projectId || null,
    name: parsed.data.name,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
    totalCost: parsed.data.totalCost,
    currency: parsed.data.currency as Currency,
    notes: parsed.data.notes ?? null,
  };

  let id = parsed.data.id;
  if (id) {
    await prisma.accommodation.update({ where: { id }, data });
    await prisma.accommodationWorker.deleteMany({ where: { accommodationId: id } });
  } else {
    const created = await prisma.accommodation.create({ data });
    id = created.id;
  }

  if (parsed.data.workerIds.length) {
    await prisma.accommodationWorker.createMany({
      data: parsed.data.workerIds.map((userId) => ({ accommodationId: id!, userId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/accommodations");
  revalidatePath(`/accommodations/${id}`);
  return { ok: true as const, data: { id } };
}

export async function deleteAccommodationAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false as const, error: "validation" };
  await prisma.accommodation.delete({ where: { id } });
  revalidatePath("/accommodations");
  return { ok: true as const };
}
```

- [ ] **Step 2: List `app/(app)/accommodations/page.tsx`**

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";

export default async function AccommodationsListPage() {
  await requireAdmin();
  const t = await getTranslations("accommodations");
  const tCommon = await getTranslations("common");
  const accs = await prisma.accommodation.findMany({
    include: { workers: true, project: true },
    orderBy: { startDate: "desc" },
  });
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-navy">{t("list")}</h1>
        <Button href="/accommodations/new" variant="primary">{t("new")}</Button>
      </div>
      <DataTable
        headers={[tCommon("name"), t("startDate"), t("endDate"), t("totalCost"), "Workers", tCommon("actions")]}
        rows={accs.map((a) => [
          a.name,
          a.startDate.toISOString().slice(0, 10),
          a.endDate.toISOString().slice(0, 10),
          `${a.totalCost.toString()} ${a.currency}`,
          a.workers.length,
          <Link key={a.id} href={`/accommodations/${a.id}`} className="text-navy underline">{tCommon("edit")}</Link>,
        ])}
      />
    </div>
  );
}
```

- [ ] **Step 3: New/edit pages use `AccommodationForm`**

`app/(app)/accommodations/AccommodationForm.tsx` (shared client component):
```tsx
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

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (initial?.id) fd.set("id", initial.id);
    for (const id of selected) fd.append("workerIds", id);
    start(async () => {
      const r = await saveAccommodationAction(fd);
      if (r.ok) router.push("/accommodations");
    });
  }

  function onDelete() {
    if (!initial?.id) return;
    const fd = new FormData();
    fd.set("id", initial.id);
    start(async () => {
      await deleteAccommodationAction(fd);
      router.push("/accommodations");
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

`app/(app)/accommodations/new/page.tsx`:
```tsx
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { getTranslations } from "next-intl/server";
import { AccommodationForm } from "../AccommodationForm";

export default async function NewAccommodationPage() {
  await requireAdmin();
  const [workers, projects] = await Promise.all([
    prisma.user.findMany({ where: { active: true, role: "WORKER" }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const t = await getTranslations("accommodations");
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("new")}</h1>
      <AccommodationForm
        workers={workers.map((w) => ({ id: w.id, name: w.name, email: w.email }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        selectedWorkerIds={[]}
      />
    </div>
  );
}
```

`app/(app)/accommodations/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { AccommodationForm } from "../AccommodationForm";

export default async function EditAccommodationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const acc = await prisma.accommodation.findUnique({
    where: { id },
    include: { workers: true },
  });
  if (!acc) notFound();

  const [workers, projects] = await Promise.all([
    prisma.user.findMany({ where: { active: true, role: "WORKER" }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{acc.name}</h1>
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
        }}
        workers={workers.map((w) => ({ id: w.id, name: w.name, email: w.email }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        selectedWorkerIds={acc.workers.map((w) => w.userId)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Build + commit**

```powershell
npm run build
git add lib/actions/accommodations.ts "app/(app)/accommodations"
git commit -m "feat: accommodations admin CRUD"
```

---

## Task 15: Wages screen + CSV export

**Files:**
- Create: `app/(app)/wages/page.tsx`
- Create: `app/(app)/wages/WagesView.tsx`
- Create: `app/(app)/wages/route.ts` (CSV export endpoint)

- [ ] **Step 1: Server page `app/(app)/wages/page.tsx`**

```tsx
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { getTranslations } from "next-intl/server";
import { computeWages } from "@/lib/portal/wages";
import { WagesView } from "./WagesView";

export default async function WagesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; projectId?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = sp.from ?? today;
  const toStr = sp.to ?? today;
  const projectId = sp.projectId || undefined;

  const from = new Date(fromStr);
  const to = new Date(toStr);

  const [workers, prices, activity, accommodations, projects] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.projectWorker.findMany({}),
    prisma.activityLog.findMany({
      where: { workDate: { gte: from, lte: to } },
      include: { projectWorker: true, table: { include: { section: true } } },
    }),
    prisma.accommodation.findMany({
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

  const t = await getTranslations("wages");

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

- [ ] **Step 2: Client `app/(app)/wages/WagesView.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/portal/DataTable";

type Row = {
  userId: string;
  name: string;
  earnings: number;
  accommodation: number;
  wage: number;
  breakdown: { tie: number; connect: number };
  warnings: string[];
};

export function WagesView({
  from,
  to,
  projectId,
  projects,
  result,
}: {
  from: string;
  to: string;
  projectId: string;
  projects: { id: string; name: string }[];
  result: { rows: Row[]; mixedCurrencies: boolean };
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations("wages");
  const [f, setF] = useState(from);
  const [tt, setTt] = useState(to);
  const [pid, setPid] = useState(projectId);

  function apply() {
    const params = new URLSearchParams(sp);
    params.set("from", f);
    params.set("to", tt);
    if (pid) params.set("projectId", pid);
    else params.delete("projectId");
    router.push(`/wages?${params.toString()}`);
  }

  function exportCsv() {
    const params = new URLSearchParams();
    params.set("from", f);
    params.set("to", tt);
    if (pid) params.set("projectId", pid);
    window.location.href = `/wages/export.csv?${params.toString()}`;
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 items-end mb-6">
        <div>
          <label className="text-xs text-muted block mb-1">{t("from")}</label>
          <input type="date" value={f} onChange={(e) => setF(e.target.value)} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">{t("to")}</label>
          <input type="date" value={tt} onChange={(e) => setTt(e.target.value)} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">{t("projectFilter")}</label>
          <select value={pid} onChange={(e) => setPid(e.target.value)} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm min-w-[200px]">
            <option value="">{t("all")}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Button onClick={apply} variant="primary">{t("calculate")}</Button>
        <Button onClick={exportCsv} variant="secondary">{t("exportCsv")}</Button>
      </div>

      {result.mixedCurrencies && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
          {t("mixedCurrencies")}
        </p>
      )}

      <DataTable
        headers={["Worker", "Tie", "Connect", t("earnings"), t("accommodation"), t("wage"), "Notes"]}
        empty={t("noData")}
        rows={result.rows
          .filter((r) => r.earnings !== 0 || r.accommodation !== 0)
          .map((r) => [
            r.name,
            r.breakdown.tie.toFixed(2),
            r.breakdown.connect.toFixed(2),
            r.earnings.toFixed(2),
            r.accommodation.toFixed(2),
            r.wage.toFixed(2),
            r.warnings.includes("missing-price") ? t("missingPrice") : "",
          ])}
      />
    </>
  );
}
```

- [ ] **Step 3: CSV export route**

Create `app/(app)/wages/export.csv/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { computeWages } from "@/lib/portal/wages";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  if (!fromStr || !toStr) return new NextResponse("Missing dates", { status: 400 });

  const projectId = url.searchParams.get("projectId") || null;
  const from = new Date(fromStr);
  const to = new Date(toStr);

  const [workers, prices, activity, accommodations] = await Promise.all([
    prisma.user.findMany({ where: { active: true } }),
    prisma.projectWorker.findMany({}),
    prisma.activityLog.findMany({
      where: { workDate: { gte: from, lte: to } },
      include: { projectWorker: true, table: { include: { section: true } } },
    }),
    prisma.accommodation.findMany({ include: { workers: true } }),
  ]);

  const result = computeWages({
    from,
    to,
    projectId,
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

  const header = ["Worker", "Tie earnings", "Connect earnings", "Earnings total", "Accommodation", "Wage", "Warnings"];
  const lines = [header.join(",")];
  for (const r of result.rows) {
    if (r.earnings === 0 && r.accommodation === 0) continue;
    lines.push([
      JSON.stringify(r.name),
      r.breakdown.tie.toFixed(2),
      r.breakdown.connect.toFixed(2),
      r.earnings.toFixed(2),
      r.accommodation.toFixed(2),
      r.wage.toFixed(2),
      JSON.stringify(r.warnings.join("; ")),
    ].join(","));
  }
  const body = lines.join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wages-${fromStr}-to-${toStr}.csv"`,
    },
  });
}
```

- [ ] **Step 4: Build + commit**

```powershell
npm run build
git add "app/(app)/wages"
git commit -m "feat: wages screen with date range, project filter, and CSV export"
```

---

## Task 16: End-to-end smoke test + public site regression

**Files:** none new — verification only.

- [ ] **Step 1: Run tests**

```powershell
npm test
```
Expected: all tests pass (contact-schema 8/8 + modules 5/5 + over-cap 4/4 + wages 8/8 = 25/25).

- [ ] **Step 2: Production build + route summary**

```powershell
npm run build
```
Expected: build succeeds. Route summary includes (at minimum):
- `/` (public)
- `/contact`
- `/contact/thanks`
- `/api/contact`
- `/api/auth/[...nextauth]`
- `/login`
- `/dashboard`
- `/projects`, `/projects/new`, `/projects/[projectId]`, `/projects/[projectId]/edit`, `/projects/[projectId]/log`
- `/workers`, `/workers/new`, `/workers/[userId]`
- `/accommodations`, `/accommodations/new`, `/accommodations/[id]`
- `/wages`, `/wages/export.csv`

- [ ] **Step 3: Boot dev server + manual scenario**

Boot Postgres if not running:
```powershell
docker compose up -d db
```

Start dev:
```powershell
npm run dev   # background
Start-Sleep -Seconds 15
```

Verify public site untouched:
```powershell
(Invoke-WebRequest http://localhost:3000/ -UseBasicParsing).StatusCode
(Invoke-WebRequest http://localhost:3000/contact -UseBasicParsing).StatusCode
```
Both 200.

Verify auth redirect:
```powershell
(Invoke-WebRequest http://localhost:3000/dashboard -UseBasicParsing -MaximumRedirection 0).StatusCode
```
Expected: 307 (redirect to `/login`).

Verify login page renders:
```powershell
(Invoke-WebRequest http://localhost:3000/login -UseBasicParsing).StatusCode
```
Expected: 200.

Login as admin (manual, in a browser):
- Open http://localhost:3000/login
- Email `admin@quantumsphere.local`, password `ChangeMe!2026`
- Should land on `/dashboard`. As admin, sidebar shows all 5 items.

Create a worker:
- Go to `/workers/new`, create worker `bob@example.com` password `bob_pw_test_123`, role WORKER, language EN.
- Confirm appears in `/workers`.

Create a project:
- `/projects/new` → name "Test Site A". Editor opens.
- Add a section "Roof North". Add a table "T1" with rows=10 cols=20 skipped=5 → modules = 195.
- Assign worker Bob with priceTie=1.5, priceConnect=2.0.

Test the worker side:
- Sign out (top bar). Log in as `bob@example.com`.
- `/dashboard` should show only "Test Site A".
- Click into it. Try logging "I tied today: 50" → success. Progress shows 50/195 tied.
- Try logging "I tied today: 200" → over-cap error appears (145 remaining).
- Try logging "I connected today: 50" → success. Progress shows 50/195 connected.

Test wages:
- Sign out, sign back in as admin.
- Add an accommodation: "Airbnb Aurora", project Test Site A, today − today, totalCost=100 USD, workers: Bob.
- Open `/wages`, From = today, To = today. Expected:
  - Bob row: tie=75.00, connect=100.00, earnings=175.00, accommodation=100.00, wage=75.00.
- Click "Export CSV". File downloads.

Sign out and end test.

Stop dev server.

- [ ] **Step 4: Commit any stray fixes; tag**

If you made any fixes during the smoke test, commit them:
```powershell
git add -A
git commit -m "fix: address issues found during smoke test"
```

Tag:
```powershell
git tag v0.2.0
```

- [ ] **Step 5: Final report**

```powershell
git log --oneline | Select-Object -First 25
git tag -l
```

---

## Self-review (author's check)

**Spec coverage:**
- Roles (admin/worker) — Tasks 1, 2, 5, 10.
- Module formula A×B−C — Task 7 + UI in Tasks 11, 13.
- Per-table counters with worker attribution — Task 13 (ActivityLog model + UI).
- Per-project per-worker prices on tie/connect — Tasks 1 (schema), 12 (UI + actions).
- Accommodation entity with equal-split among workers + any-overlap deduction — Tasks 9 (math), 14 (CRUD).
- Date-range wages screen + CSV — Task 15.
- 24-hour worker edit window — Task 13 (`updateLogAction`, `deleteLogAction`).
- Over-cap invariant — Tasks 8 + 13.
- Soft delete for workers (`active`) and projects (status) — Tasks 1, 10, 11.
- next-intl EN/SK — Task 3 + every UI task uses `useTranslations`.
- Auth.js v5 credentials + middleware — Tasks 2, 5.
- Postgres via Prisma — Tasks 0, 1.
- Public site untouched — Task 4 moves landing into `(public)`; smoke-tested in Task 16.

**Placeholder scan:** No TBDs. Every step has runnable commands or actual code.

**Type consistency:**
- `Locale` enum is `EN | SK` everywhere (Prisma) but lowercased to `"en" | "sk"` at the i18n boundary; this conversion happens in `lib/i18n/request.ts` and `app/(app)/layout.tsx` — consistent.
- `ActivityAction` `TIE | CONNECT` is consistent across schema, over-cap, wages, activity action.
- `Currency` `USD | EUR` matches schema, wage input, accommodation form.
- `Role` `ADMIN | WORKER` matches everywhere.
- `WageInput` / `WageRow` types defined in `lib/portal/wages.ts` and consumed by `WagesView` and the CSV route — consistent.

**Known gotchas:**
- Login route lives at `app/login/page.tsx` (outside `(app)`) to avoid the layout-guard redirect loop. Middleware whitelists `/login`.
- `/api/contact` stays at `app/api/contact/route.ts` (not under `(public)`). API routes don't need the route group split.
- Prisma `Decimal` is returned as a Decimal object; we call `Number(...)` at boundaries (server pages and wage math input). If counts get large or precision matters, switch to `decimal.js` everywhere — out of scope for v1.
- next-intl `getTranslations` is server-side; client components use `useTranslations` from `next-intl` (auto-imported with the provider).

**Open assumptions (intentional):**
- `bcryptjs` (pure JS) used instead of `bcrypt` to avoid native build issues on Windows.
- `next-auth@beta` is Auth.js v5; stable v5 release expected — if `@beta` is no longer published, swap to `next-auth@^5`.
- Docker Compose for Postgres; production target is Neon/Supabase via `DATABASE_URL`.
- Session strategy is JWT (required for Credentials provider in Auth.js v5). Role and language live in the JWT to avoid a DB lookup per request.

**Total commit count:** Roughly 17 commits (one per task plus the bootstrap split).
