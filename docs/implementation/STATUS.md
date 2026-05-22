# Implementation Status

_Running log. One entry per task in numerical order._

## Plan started: 2026-05-22

Source plan: `CLAUDE_CODE_PROMPT.md` (autonomous restructure of qs-web).

**Pre-flight decisions confirmed with David (2026-05-22):**
- **Positioning:** Rebrand from solar-EPC subcontractor → 5-trade general construction (solar, electrical, drywall, masonry, roofing).
- **i18n architecture:** Migrate from cookie-based 2-locale (EN/SK) → URL-prefix `[locale]` routing with 5 locales (sk, en, de, fr, sv).

**Global deviations from the plan (Rule 7 — documented):**
- i18n files live under `lib/i18n/` (existing convention; `next.config.ts` already points at `./lib/i18n/request.ts`), NOT root `i18n/`. All plan references to `@/i18n/*` are implemented as `@/lib/i18n/*`.

---

### Task 00: Audit — ✅ Done (2026-05-22)
- Branch / commit: `docs/00-bootstrap`
- Files changed: 2 (`docs/implementation/STATUS.md`, `docs/implementation/AUDIT.md`)
- Build / Lint: n/a (docs only)
- Notes: Full audit written to `AUDIT.md`. Repo state materially differs from plan assumptions (i18n already wired, app already in route groups, solar-EPC positioning, 2-locale enum). Confirmed direction with David before proceeding.
- Follow-up: none

---

> **Known baseline issue (affects all tasks' lint gate):** `npm run lint` already fails
> on `main` with **2 errors + 3 warnings** in pre-existing portal files —
> `app/(app)/wages/MyWagesView.tsx` (`react-hooks/set-state-in-effect`),
> `app/(app)/projects/[projectId]/log/TableLogger.tsx` (`react-hooks/purity`),
> `app/(app)/workers/[userId]/page.tsx` + `lib/contact-schema.test.ts` (unused vars).
> Cause: stricter `react-hooks` rules in `eslint-config-next@16`. These are NOT introduced
> by this plan. Gate criterion adopted (Rule 7): **a task passes lint if it introduces no
> NEW lint problems**. → **David follow-up:** decide whether to fix these separately.

---

### Task 01: i18n routing / navigation / request — ✅ Done (2026-05-22)
- Branch: `feat/01-i18n-routing`
- Files changed: 3 (`lib/i18n/routing.ts` new, `lib/i18n/navigation.ts` new, `lib/i18n/request.ts` rewritten)
- Build: ✅ / Lint: ✅ (no new problems; baseline errors unchanged) / tsc: ✅ / config.test: ✅ (5/5)
- Notes:
  - Verified next-intl 4.12 API against `node_modules/next-intl/dist/types/` — `defineRouting`, `createNavigation`, `getRequestConfig({requestLocale})` all match plan.
  - Files placed under `lib/i18n/` (not root `i18n/`) per global deviation; `next.config.ts` already points there (Task 03 effectively pre-done).
  - `request.ts` rewritten to derive locale from `requestLocale` (URL segment) instead of cookie+session. Messages imported via `@/messages/${locale}.json`.
  - Kept `lib/i18n/config.ts` + its test intact for the Task 20 login-default mapping (still EN/SK; expand later).
- Follow-up:
  - **Transient:** until Task 04 adds the `[locale]` segment + Task 05 wires the intl proxy, `requestLocale` is undefined so the portal falls back to `defaultLocale` (sk). Resolves at Task 04/05.
  - `config.ts` still defaults to `en` while `routing.ts` defaults to `sk` — reconcile in Task 20.

---

### Task 02: messages skeleton (5 locales) — ✅ Done (2026-05-22)
- Branch: `feat/02-messages`
- Files changed: 5 (`messages/{sk,en,de,fr,sv}.json`)
- Build: ✅ / Lint: ✅ (no new problems) / JSON valid: ✅ / Schema: 259 identical key paths across all 5 locales
- Notes (deviation from plan's Task 02 schema, per Rule 1):
  - **Preserved** existing top-level PORTAL namespaces (`common, login, nav, projects, workers, changePassword, accommodations, wages, log, errors, error`) instead of nesting portal under `portal.*`. The portal was already fully i18n'd — so the plan's Task 19 ("wrap hardcoded portal strings") is largely pre-done; it becomes "ensure 5 locales".
  - **Added** marketing namespaces: `home, services, about, contact, notFound`. Extended shared `nav` (added home/services/about/contact/portal) and `common` (added siteName/skipToContent/menu/close/errorGeneric/next) — no key-name collisions with portal keys.
  - SK: real Slovak for portal + marketing `nav`/`common` additions + `services.*.name`. Marketing bodies = `"..."` (Task 11).
  - EN: real English portal; marketing translatable = `"..."` (Task 15).
  - DE/FR/SV: portal namespaces seeded with **English** (working fallback — avoids broken portal UI, since next-intl does not auto-fallback to default locale and `User.language` is only EN/SK). Marketing = `"..."` (Task 16). Tagged `_TODO` + `_TODO_PORTAL_TRANSLATIONS`.
- Follow-up: Task 11/15/16 fill `"..."` placeholders. Portal DE/FR/SV stays English until a future portal-translation pass (was plan Task 19 follow-up).

---
