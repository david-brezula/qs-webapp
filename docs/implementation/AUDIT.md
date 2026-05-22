# Repo Audit — 2026-05-22

One-page snapshot of the repo at plan start, per Section 0 of `CLAUDE_CODE_PROMPT.md`.

## Stack (confirmed from package.json)
- Next.js **16.2.6** (App Router), React **19.2.4**
- next-intl **^4.12.0** — **already wired** (see below)
- Prisma **^7.8.0** + `@prisma/adapter-pg`, Postgres
- NextAuth **^5.0.0-beta.31** + `@auth/prisma-adapter`
- Tailwind **v4** (`@tailwindcss/postcss`), Zod **4**, framer-motion **12**, nodemailer **7**, lucide-react **1.14**
- Vitest **4** (existing unit tests under `lib/`)

## Existing routes (under `app/`)
Already organized into **route groups** (NOT root-level as the plan assumed):
- `app/(public)/` — marketing: `page.tsx` (home), `contact/page.tsx`, `contact/thanks/page.tsx`, `layout.tsx`
- `app/(app)/` — portal: `dashboard`, `projects` (+ `[projectId]` edit/log/sections, `new`), `workers` (+ `[userId]`, `new`), `accommodations` (+ `[id]`, `new`), `wages` (+ projects/sections views, `export.csv`), `error.tsx`, `layout.tsx`
- `app/login/` — `page.tsx`, `layout.tsx`
- `app/change-password/` — `page.tsx`, `layout.tsx`, `ChangePasswordForm.tsx`
- `app/api/` — `auth/[...nextauth]`, `contact`, `wages/projects/[projectId]/sections`
- `app/layout.tsx` (root, Plus Jakarta Sans font, `lang="en"`), `app/globals.css`
- **No `[locale]` segment yet.** No top-level `not-found.tsx`.

## Existing components (top-level under `components/`)
- Marketing (solar-specific): `Nav`, `Footer`, `sections/{Hero,Stats,Capabilities,Process,Projects,Certifications,Coverage,Testimonials,ContactCTA,Reveal}`
- UI: `ui/{Button,Container,Card,SectionHeading}`
- Portal: `portal/{Sidebar,TopBar,MobileNav,DataTable,FormField,FormSelect,LocaleToggle,LangSync,ProjectLogView,SectionList,SectionTables,ProjectSectionList,ProgressGraph}`
- **No `components/marketing/` dir yet.**

## i18n setup — ALREADY WIRED (cookie-based, 2 locales)
- `next.config.ts`: `createNextIntlPlugin("./lib/i18n/request.ts")` (Task 03 effectively done, different path).
- `lib/i18n/config.ts`: `LOCALES = ["en","sk"]`, `DEFAULT_LOCALE = "en"`, `resolveLocale({cookieLocale, sessionLanguage})` — cookie wins over account language. Has passing unit tests (`config.test.ts`).
- `lib/i18n/request.ts`: reads `locale` cookie + `auth()` session `user.language`; imports `@/messages/${locale}.json`. **No URL/`requestLocale` handling.**
- `messages/en.json`, `messages/sk.json` — **portal-focused schema** (`common, login, nav, projects, workers, changePassword, accommodations, wages, log, errors, error`). No marketing/services keys. Schema differs from plan's Task 02 schema.
- `components/portal/LocaleToggle.tsx` — sets `locale` cookie + `router.refresh()`.
- `components/portal/LangSync.tsx` — syncs `document.documentElement.lang`.

## Prisma User model
```
User { id, username @unique, email? @unique, passwordHash, name,
       role Role @default(WORKER), language Locale @default(EN),
       active, mustChangePassword, defaultPriceTie, defaultPriceConnect, createdAt }
enum Role { ADMIN WORKER }
enum Locale { EN SK }   // only 2 — plan needs 5
```
- Plan's Task 06 wants `locale String @default("sk")`. Existing field is `language Locale` enum. Will reconcile in Task 06 (expand to support 5 locales).
- `datasource db` has **no explicit `url`** in schema (env-driven via adapter). Migrations need a DB connection — likely Rule 6 (Partial) territory.
- Domain models: `Project, Section, Table, TableClaim, ProjectWorker, ActivityLog, Accommodation, AccommodationWorker, ContactSubmission`.
- `ContactSubmission` is **solar-specific**: `company, name, email, projectType, sizeMW Float, country, startDate, scope String[], notes`.

## Auth
- NextAuth v5 beta, `@auth/prisma-adapter`. `@/auth` module exists (referenced by `lib/i18n/request.ts`). `proxy.ts` uses `getToken` (NOT `auth()` wrapper) — already follows Next 16 convention.
- `proxy.ts` exists: auth gate only, no locale prefixing. Public paths: `/`, `/contact`, `/api/contact`, `/login`, `/api/auth`, assets. Admin-only prefixes with worker exceptions for `/projects/[id]/log` and `/wages`.

## Pre-existing dirs
- `messages/` ✅ exists (2 files). `lib/i18n/` ✅ exists. No root `i18n/` dir.

## Key implications for the plan
1. **i18n migration, not greenfield.** Tasks 01/03 partly done; must rewrite `request.ts` for `requestLocale`, expand to 5 locales, preserve `resolveLocale` for the login-default mapping (Task 20).
2. **App restructure** (Task 04) moves `(public)`/`(app)`/`login`/`change-password` under `[locale]`. Existing route-group layouts must be preserved.
3. **Rebrand** (Tasks 07-11) replaces solar-EPC marketing with 5-trade content; existing `components/sections/*` are solar-specific and may be repurposed or retired.
4. **Messages schema differs** — existing portal keys must be preserved/merged with the plan's new marketing+services keys (Rule 1).
5. **Working tree is dirty** with untracked artifacts (logs, screenshots, `supabase/`, `docker/`, `page.html`, scripts). Each task stages ONLY its own files.
