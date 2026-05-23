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

### Task 03: wire next-intl plugin — ✅ Done (pre-satisfied) (2026-05-22)
- Branch / commit: none (no code change)
- Notes: `next.config.ts` already calls `createNextIntlPlugin("./lib/i18n/request.ts")` (from prior work). Verified it points at the request config rewritten in Task 01. Nothing to change. Recorded here for completeness.
- Follow-up: none

---

### Task 04: restructure app/ under [locale] — ✅ Done (2026-05-22)
- Branch: `feat/04-locale-restructure`
- Files changed: ~42 (git-tracked renames + new [locale]/layout.tsx + 6 marketing stubs + 1 import fix; deleted app/layout.tsx)
- Build: ✅ (all routes under `/[locale]/…`; marketing SSG ×5 locales, portal dynamic) / Lint: ✅ (no new problems) / cache: cleared stale `.next/dev` types
- Moves (via `git mv`, history preserved):
  - `app/(public)/` → `app/[locale]/(marketing)/`
  - `app/(app)/` → `app/[locale]/(portal)/`
  - `app/login/` → `app/[locale]/login/` (NOT under (portal) — its layout calls `requireUser()` and would loop)
  - `app/change-password/` → `app/[locale]/change-password/` (same reason)
- New `app/[locale]/layout.tsx`: html/body + Plus Jakarta font + `NextIntlClientProvider` + `generateStaticParams` (locales) + `setRequestLocale`. Deleted old `app/layout.tsx` (root layout is now the `[locale]` layout — standard next-intl pattern, confirmed Next 16 requires html/body in root layout).
- Fixed `components/portal/SectionTables.tsx` import of moved `TableLogger`.
- Created stub pages: `(marketing)/{solar,electrical,drywall,masonry,roofing,about}/page.tsx` (real content Task 09). `contact` moved (existing).
- **Deviations / deferrals (Rule 7, documented):**
  - **Link conversion deferred.** Portal keeps `next/link` (English slugs resolve via the intl middleware's locale prefix — one redirect hop, acceptable for an internal tool). Marketing components (`Nav`/`Footer`/sections, contact) keep `next/link` for now and are rebuilt with next-intl `Link` in Tasks 07/09/10. So localized marketing slugs are not yet emitted by links.
  - Redundant nested `NextIntlClientProvider` in (portal)/login/change-password layouts left in place (harmless; parent [locale] layout also provides). May simplify later.
  - `metadataBase` uses `NEXT_PUBLIC_SITE_URL ?? https://quantum-sphere.eu`. **Domain discrepancy:** old code used `quantumsphere.eu` (no hyphen); plan uses `quantum-sphere.eu`. → **David follow-up:** confirm canonical domain.
- **Transient state until Task 05:** `proxy.ts` is still auth-only (no locale handling), so `/` does not yet redirect to `/sk`, and localized slugs (`/sk/solarne-elektrarne`) are not yet active — only internal paths (`/sk/solar`). Resolves in Task 05.
- Follow-up: Task 05 (proxy), Task 07/09/10 (marketing link conversion), domain confirmation.

---

### Task 05: rewrite proxy.ts (locale + auth) — ✅ Done (2026-05-22)
- Branch: `feat/05-proxy`
- Files changed: 1 (`proxy.ts`)
- Build: ✅ / Lint: ✅ (no new problems) / Runtime smoke test: ✅
- Notes:
  - Combined next-intl `createMiddleware(routing)` (default export, verified in `node_modules/next-intl/dist/types/middleware/middleware.d.ts`) with the existing auth gate (`getToken`, admin-only prefixes, worker exceptions for `/projects/[id]/log` and `/wages`).
  - Adapted plan: import from `./lib/i18n/routing`; added `/change-password` to protected `PORTAL_PATHS`.
  - Runtime smoke test (prod server) all pass: `/`→307 `/sk`; `/sk`→200; `/sk/login`→200; `/sk/dashboard` (no auth)→307 `/sk/login?from=…`; `/sk/solarne-elektrarne`→200 (localized SK slug live); `/en/solar-power-plants`→200; `/sk/solar`→307→`/sk/solarne-elektrarne` (canonicalizes to localized slug).
- Follow-up: none. Localized marketing slugs are now active site-wide.

---

### Task 06: Prisma User.locale — ⚠️ Partial (2026-05-22)
- Branch: `feat/06-user-locale`
- Files changed: 2 (`prisma/schema.prisma`, `prisma/migrations/20260522120000_add_user_locale/migration.sql`)
- Build: ✅ (regenerated client) / Lint: ✅ (no new problems) / `prisma generate`: ✅
- Notes:
  - Added `locale String @default("sk")` to `User` (plan's approach). Lowercase, matches `routing.locales`. Kept the existing `language Locale (EN|SK)` enum (deeply wired across ~32 files: auth, session, worker forms, TopBar) — did not touch it.
  - Migration SQL written **manually** (not via `migrate dev`) and **NOT applied** — the DB is Postgres with RLS (Supabase); applying autonomously is unsafe (Rule 6). Migration backfills `locale = lower(language)` for existing users.
- **Why Partial / David follow-up:** run `npx prisma migrate deploy` (or `migrate dev` locally) against the database to apply `20260522120000_add_user_locale`. Documented in DEPLOYMENT.md (Task 17).
- **Design follow-up:** `language` (enum, account language, drives portal i18n + session) and `locale` (string, URL-locale preference, Task 20) now overlap. Consider consolidating to a single field later.

---

### Task 07: marketing shell components — ✅ Done (2026-05-22)
- Branch: `feat/07-marketing-shell`
- Files: new `components/marketing/{Logo,LanguageSwitcher,MarketingHeader,MarketingFooter}.tsx`, new `lib/services.ts`, edited `lib/i18n/routing.ts` (localeLabels), `components/ui/Button.tsx` (export `buttonClass`), `messages/*.json` (footer namespace ×5), `app/[locale]/(marketing)/layout.tsx`, home + contact pages (strip duplicate chrome).
- Build: ✅ / Lint: ✅ (no new problems) / SSR check: ✅ (SK chrome renders: logo, nav, service names, footer)
- Notes:
  - `MarketingHeader` (client): scroll-aware sticky, services dropdown (5 trades w/ icons from `lib/services.ts`), `LanguageSwitcher`, portal link, mobile menu. `MarketingFooter` (server): brand+tagline, services, company, contact (real `lib/content` FOOTER details), bottom bar w/ switcher.
  - `LanguageSwitcher` (client): custom dropdown, 5 native labels, `router.replace(pathname,{locale})` preserves path; `placement="top"` variant for footer.
  - Pulled `lib/services.ts` forward from Task 08 (header needs it) — Task 08 now only adds the ServicePage template.
  - Deviations (Rule 7): used existing `@/components/ui/Container` instead of a new `components/marketing/Container` (avoid duplication); added `footer` namespace (tagline/company/rights) to messages (SK real, others `"..."`).
  - Removed the embedded solar `Nav`/`Footer` from home + contact pages; chrome now from the marketing layout. Home still shows the original solar sections (replaced Task 10); contact still the solar form (reworked Task 09) — transient.
- Follow-up: Task 10 (home body), Task 09 (contact rework), translations for footer/nav/services in en/de/fr/sv (Tasks 15/16).

---

### Task 08: lib/services.ts + ServicePage template — ✅ Done (2026-05-22)
- Branch: `feat/08-servicepage`
- Files: new `components/marketing/ServicePage.tsx` (`lib/services.ts` already created in Task 07)
- Build: ✅ / Lint: ✅ (no new problems)
- Notes:
  - `ServicePage({ slug })` — server component (FAQ uses native `<details>`, no JS). Sections: hero (icon + name + title + subtitle + CTAs), description, deliverables, process (numbered), FAQ, contact CTA.
  - Content from `services.<slug>` via `useTranslations` + `t.raw()` for arrays. Array sections (deliverables/process/faq) render only when non-empty, so the placeholder state stays clean until Task 11 fills SK content.
  - CTA labels reuse already-translated `nav.contact`/`nav.about` (no new keys). Styled with existing design tokens + `buttonClass`.
- Follow-up: Task 09 wires the 5 trade pages to render `<ServicePage slug=…/>`; Task 11/15/16 fill copy.

---

### Task 09: trade pages + about + contact rework — ✅ Done (2026-05-22)
- Branch: `feat/09-marketing-pages`
- Files: 5 trade pages → `<ServicePage>`, about page (real), contact page (reworked), `lib/contact-schema.ts` + test, `lib/mailer.ts`, `app/api/contact/route.ts`, deleted `contact/thanks/`, `messages/*.json` (contact.form serviceSelect/serviceOther ×5)
- Build: ✅ / contact-schema test: ✅ (6/6) / Lint: ✅ (4 problems = baseline−1; my test rewrite removed the old `_notes` warning; no new problems) / SSR check: ✅ (/sk/kontakt + service pages 200)
- Notes:
  - 5 trade pages call `setRequestLocale` + render `<ServicePage slug=…/>`. About page renders `about.title` + `about.body` (whitespace-pre-line).
  - **Contact reworked from solar → generic construction inquiry**: fields name/email/phone/company/serviceType(5 trades + other)/message, i18n labels, inline success state (dropped separate `/thanks` route).
  - New generic `contactSchema`; `/api/contact` **maps onto the legacy ContactSubmission columns** (projectType←serviceType, notes←message+phone, dummy sizeMW=0/country=""/scope=[]) so **no DB migration needed and the live form keeps working**. `mailer` updated to generic fields.
  - Content placeholders: SK contact/about/service copy still `"..."` until Task 11; en/de/fr/sv until 15/16.
- **Design follow-up (David):** clean up `ContactSubmission` model — add real `phone`/`serviceType`/`message` columns, drop solar-only ones. Left `lib/content.ts` solar constants (CONTACT_SCOPE_OPTIONS, EU_COUNTRIES) unused; removed when home sections go (Task 10).
- Minor follow-up: Zod validation messages are still English (server-side); could be localized later.

---

### Task 10: marketing homepage + solar cleanup — ✅ Done (2026-05-22)
- Branch: `feat/10-homepage`
- Files: new `components/marketing/{MainHero,ServicesGrid,ServiceCard,AboutTeaser}.tsx`, rewrote `app/[locale]/(marketing)/page.tsx`; **deleted** `components/Nav.tsx`, `components/Footer.tsx`, `components/sections/*` (10 files); trimmed `lib/content.ts` to just `FOOTER`.
- Build: ✅ / Lint: ✅ (4 problems = baseline, no new) / SSR check: ✅ (/sk 200, all 5 service cards render, no errors)
- Notes:
  - Homepage = `MainHero` (kicker/title/subtitle + 2 CTAs, blueprint-grid backdrop) + `ServicesGrid` (5 `ServiceCard`s from `lib/services.ts`, uses `SectionHeading`) + `AboutTeaser`. All locale-aware.
  - **Cleanup:** removed the orphaned solar marketing code (only referenced by itself after the homepage rebrand). `lib/content.ts` trimmed to company contact details used by `MarketingFooter`.
  - Skipped `home.featuredProjects` section — no real project data (Rule 3, don't invent). Keys remain in messages, unused for now.
  - Content placeholders: SK home copy (`home.*`) still `"..."` until Task 11; en/de/fr/sv until 15/16.
- Follow-up: Task 11 fills SK home/services/about/contact copy; visual screenshot review best done after Task 11.

---

### Task 11: Slovak content (messages/sk.json) — ✅ Done (2026-05-22)
- Branch: `feat/11-sk-content`
- Files: `messages/sk.json`
- Build: ✅ / Lint: ✅ (no new) / JSON valid (all 5) / Visual QA: ✅ (screenshotted /sk + /sk/solarne-elektrarne)
- Notes:
  - Filled SK `home`, `services.*` (tagline/meta/hero/description/deliverables/process/certifications/faq), `about`, `contact` from the plan's content via **deep-merge** (temp file) — preserved existing `common`/`nav`/`footer`/portal namespaces + `services.*.name` + `serviceSelect`/`serviceOther`. Added root `_TODO` (native review marker, Rule 4).
  - sk.json reformatted to 2-space indent by the merge (cosmetic; en/de/fr/sv reformat similarly when filled in 15/16).
  - **Visual QA confirmed** the rebrand renders cleanly: homepage (hero, 5-card services grid, about teaser, footer) and the solar ServicePage (hero, deliverables, numbered process, FAQ, dark CTA band) look polished and on-brand.
- Follow-up: native-speaker review of SK copy before launch; Tasks 15/16 fill en/de/fr/sv.

---

### Task 12: SEO metadata + hreflang — ✅ Done (2026-05-22)
- Branch: `feat/12-seo`
- Files: new `lib/seo.ts`, `generateMetadata` on home + 5 service pages + about; contact split into server `page.tsx` (metadata) + client `ContactForm.tsx`
- Build: ✅ / Lint: ✅ (no new) / Runtime verify: ✅
- Notes:
  - `lib/seo.ts` `alternatesForPathname()` builds the hreflang `languages` map + `canonical` from `routing.pathnames` (localized slugs).
  - Each marketing page's `generateMetadata` uses `getTranslations({locale, namespace})` + `title:{absolute:…}` (meta titles already include the brand, so absolute avoids double-branding) + description + alternates.
  - **Contact refactor:** client form moved to `ContactForm.tsx`; `page.tsx` is now a server component (required to export `generateMetadata`).
  - Verified rendered `<head>` for `/sk/solarne-elektrarne`: branded `<title>`, description, `<link rel=canonical href=https://quantum-sphere.eu/sk/solarne-elektrarne>`, and 5 `rel="alternate"` hreflang links.
- Follow-up: en/de/fr/sv meta titles/descriptions fill in Tasks 15/16.

---

### Task 13: sitemap.ts + robots.ts — ✅ Done (2026-05-22)
- Branch: `feat/13-sitemap-robots`
- Files: new `app/sitemap.ts`, `app/robots.ts`; edited `proxy.ts` (matcher)
- Build: ✅ / Lint: ✅ (no new) / Runtime verify: ✅
- Notes:
  - `sitemap.xml` lists all 8 marketing paths × 5 locales = **40 localized URLs** (verified, 200 application/xml).
  - `robots.txt` (verified, 200) allows all, disallows `/api/` + portal areas (`/*/dashboard`, `/projects`, `/workers`, `/accommodations`, `/wages`, `/login`, `/change-password`), references the sitemap.
  - **Proxy matcher updated** to exclude `sitemap.xml` and `robots.txt` (otherwise the intl middleware would locale-redirect them).
  - URLs use `NEXT_PUBLIC_SITE_URL ?? https://quantum-sphere.eu`.
- Follow-up: none.

---

### Task 14: OG images via next/og — ✅ Done (2026-05-22)
- Branch: `feat/14-og-images`
- Files: new `lib/og.tsx` + 6 `opengraph-image.tsx` (home + 5 services)
- Build: ✅ / Lint: ✅ (no new) / Runtime verify: ✅ (OG route → 200 image/png, 49 KB)
- Notes:
  - Shared `renderOgImage({eyebrow,title})` (dark branded card + crosshair mark). Resilient font load: fetches Plus Jakarta Sans (700) for diacritics, **try/catch fallback** to built-in font so it never throws (Rule 2/3) — confirmed it still returns a valid PNG.
  - Default (Node) runtime, not edge, for next-intl compatibility. `size`/`alt`/`contentType` inlined per file for static analysis. Content from `home.hero` / `services.<slug>` via `getTranslations`.
  - Verified `og:image` meta points to the hashed route and the route serves `image/png`.
  - Non-SK OG titles show `"..."` until Tasks 15/16 fill copy.
- Follow-up: none (about/contact reuse the homepage OG via the layout default).

---

### Task 15: English translation (messages/en.json) — ✅ Done (2026-05-22)
- Branch: `feat/15-en-content`
- Files: `messages/en.json`
- Build: ✅ / Lint: ✅ (no new) / JSON valid / 0 remaining `"..."`
- Notes:
  - Translated all marketing copy SK→EN (British English, B2B construction tone): home, services ×5 (incl. names, taglines, deliverables/process/faq arrays), about, contact, plus nav/common marketing keys, footer, and notFound. Deep-merged (preserved EN portal namespaces). Root `_TODO` native-review marker.
  - Kept parallel to SK; did not invent market-specific facts (Rule 4).
- Follow-up: native-speaker review before launch. Task 16 translates EN→DE/FR/SV.

---

### Task 16: German, French, Swedish translations — ✅ Done (2026-05-22)
- Branch: `feat/16-translations`
- Files: `messages/de.json`, `messages/fr.json`, `messages/sv.json`
- Build: ✅ / Lint: ✅ (no new) / JSON valid / **0 remaining `"..."`, 0 missing keys vs en, 0 schema drift** (all 3)
- Notes:
  - Used **3 parallel subagents** (dispatching-parallel-agents skill) — one per language — to translate EN→DE/FR/SV marketing namespaces into temp files; then deep-merged each (preserving the English portal fallback namespaces). Each tagged with `_TODO` native-review marker.
  - Language guidance applied: DE formal "Sie" + compound nouns; FR "vous" formal; SV natural register.
  - Verified each merge: complete key parity with en, no placeholders. Visual QA of `/de` homepage — layout handles German compound words; trade names correct (Solarkraftwerke, Trockenbau, Dachmontage…). Spot-checked nav/hero/service names across all 3: natural and correct.
  - Portal namespaces in de/fr/sv remain English (Task 19 follow-up, unchanged).
- Follow-up: native-speaker review of all three before marketing launch in those markets.

---

### Task 17: DEPLOYMENT.md — ⚠️ Partial (2026-05-22)
- Branch: `docs/17-deployment`
- Files: new `DEPLOYMENT.md`
- Build/Lint: n/a (docs)
- Notes: Documented the manual deployment steps requiring David's credentials — apply DB migrations (`prisma migrate deploy` for `add_user_locale`), confirm canonical domain, Vercel domains (marketing + portal hosts), DNS, env vars (incl. `NEXT_PUBLIC_APP_URL`, `AUTH_URL`), post-DNS verification, and post-launch follow-ups (native review, portal de/fr/sv, ContactSubmission cleanup, language/locale consolidation).
- **Why Partial / David follow-up:** all steps require human credentials/access. Documented; cannot be executed autonomously (Rule 6).

---

### Task 18: host-aware proxy.ts — ⚠️ Partial (2026-05-22)
- Branch: `feat/18-host-routing`
- Files: `proxy.ts`, `components/marketing/MarketingHeader.tsx`
- Build: ✅ / Lint: ✅ (no new) / Runtime verify (spoofed Host): ✅
- Notes:
  - Added a host split (runs only on real prod hosts; skipped for localhost/`*.vercel.app`): marketing host serving a portal path → redirect to `PORTAL_HOST`; portal host serving a marketing path → redirect to `MARKETING_HOST`. Hosts derived from `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` (fallback quantum-sphere.eu / app.quantum-sphere.eu). Clears port on redirect.
  - Verified with spoofed `Host`: MKT+/sk/dashboard→307 app host; APP+/sk→307 mkt host; MKT+/sk→200; APP+/sk/dashboard→307 login (auth gate).
  - `MarketingHeader` portal links now use a `PortalLink` helper: targets `NEXT_PUBLIC_APP_URL/{locale}/login` in production, same-host next-intl `Link` in dev/preview.
- **Why Partial / David follow-up:** real cross-host behavior needs the two production domains + DNS live (see DEPLOYMENT.md). Logic verified locally.

---

### Task 19: Portal i18n — ✅ Done (pre-satisfied) (2026-05-22)
- Branch: `docs/19-portal-i18n` (verification + STATUS only; no code change)
- Notes:
  - The portal was already built **i18n-first** (worker-portal plan): all user-facing strings use `useTranslations`/`getTranslations` with top-level namespaces (`common, login, nav, projects, workers, accommodations, wages, log, changePassword, errors, error`). Verified — portal files lacking a translations import are structural components that receive labels via props or compose i18n'd children (DataTable, FormField, SectionList, ProgressGraph, layout, leaf pages).
  - Portal keys present in all 5 message files (SK + EN real; de/fr/sv English fallback with `_TODO_PORTAL_TRANSLATIONS`). EN omits the flag — its portal copy is complete English (not a fallback).
  - So the plan's "wrap hardcoded strings" work was unnecessary; this task is verification.
- Follow-up: proper de/fr/sv portal translations (post-launch, flagged). The cookie-based `LocaleToggle` is superseded by Task 20's portal switcher.

---

### Task 20: user locale flow — ✅ Done (DB persistence pending migration) (2026-05-22)
- Branch: `feat/20-user-locale`
- Files: new `lib/actions/locale.ts`, new `components/portal/PortalLanguageSwitcher.tsx`; edited `lib/actions/auth.ts`, `components/portal/TopBar.tsx`, `(portal)/layout.tsx`, `login/page.tsx`, `change-password/page.tsx`; deleted `components/portal/LocaleToggle.tsx`
- Build: ✅ / Lint: ✅ (no new) / Runtime: ✅ (/sk/login, /de/login 200)
- Notes:
  - `PortalLanguageSwitcher` (5-locale dropdown) replaces the old EN/SK `LocaleToggle` in the TopBar, login and change-password pages. It swaps the leading locale segment of the current path (works on any portal route incl. dynamic) and persists to `User.locale` via the `updateUserLocale` server action.
  - **All DB reads/writes of `locale` are best-effort (try/catch)** so they never break login/portal before the migration is applied: `updateUserLocale` swallows failures; `loginAction` reads `user.locale` in a nested try/catch and the client redirects to `/{locale}/dashboard` (falls back to cookie/default when unavailable).
  - Cross-session locale persistence already works via next-intl's `NEXT_LOCALE` cookie (set on navigation); the DB field adds cross-device persistence once migrated.
- **Dependency:** full DB persistence + DB-based login redirect activate once `add_user_locale` is applied (DEPLOYMENT.md step 0 / Task 06). Until then it degrades gracefully to URL/cookie locale.

---

### Task 21: localized 404 + analytics — ✅ Done (2026-05-22)
- Branch: `feat/21-not-found`
- Files: new `app/[locale]/not-found.tsx`, new `app/[locale]/[...rest]/page.tsx`, `messages/sk.json` (notFound)
- Build: ✅ (one transient `next/font` Google-Fonts fetch failure on a retry — re-ran clean) / Lint: ✅ (no new) / Runtime: ✅
- Notes:
  - `[locale]/not-found.tsx` renders a localized 404 (`notFound.*`). Added `[locale]/[...rest]/page.tsx` catch-all that `setRequestLocale` + `notFound()` so unmatched paths render the 404 **within** the locale provider context (next-intl gotcha — without it translations don't resolve). Verified: `/sk/does-not-exist` → 404 "Stránka sa nenašla"; `/de/nope` → "Seite nicht gefunden". Valid pages unaffected (/sk, /sk/solarne-elektrarne → 200).
  - Filled SK `notFound` (en/de/fr/sv already done in Tasks 15/16).
  - **Analytics intentionally skipped** — no `posthog-js` (or any analytics) in `package.json`. Per plan, left as a follow-up rather than wiring a new dependency.
- Follow-up (David): add analytics (e.g. PostHog/Plausible/Vercel Analytics) if desired — page views with `locale`, service CTA clicks, contact submit.

---

### Task 22: Lighthouse audit + fixes — ✅ Done (2026-05-22)
- Branch: `feat/22-lighthouse`
- Files: `lib/seo.ts`, 8 marketing pages (pass locale), `components/marketing/MarketingFooter.tsx`, new `docs/implementation/LIGHTHOUSE.md`
- Build: ✅ / Lint: ✅ (no new) / Lighthouse run: ✅ (real audit via Playwright Chromium)
- Scores (localhost prod build, after fixes): **Performance 99, Accessibility 100, Best-Practices 100, SEO 92\***. FCP 1.1s, LCP 2.4s, CLS 0, TBT 10ms.
- Fixes:
  - **a11y color-contrast** (was 0): footer fine-print `mist`→`slate` (2.56:1 → ~7:1). A11y → 100.
  - **SEO canonical de-indexing bug** (real bug in plan's seo.ts): canonical pointed every locale at the default → would de-index en/de/fr/sv. Now self-referencing per locale (`alternatesForPathname(path, locale)`); verified `/en`→`https://quantum-sphere.eu/en`.
  - \* The residual SEO 92 is a **localhost artifact** — canonical uses the prod domain (quantum-sphere.eu) ≠ localhost; valid in production. Re-run on the live domain post-deploy. Details in `LIGHTHOUSE.md`.
- Follow-up: re-run Lighthouse on live domain (confirms SEO ~100).

---

## Plan finished: 2026-05-22

- ✅ Done: **20** (Tasks 00, 01, 02, 03, 04, 05, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22)
- ⚠️ Partial: **3** (Tasks 06, 17, 18)
- 🔒 Blocked: **0**

The repo is restructured into a 5-language (`sk`/`en`/`de`/`fr`/`sv`) URL-prefixed
marketing site for a 5-trade construction company, with the existing portal
preserved under `[locale]/(portal)`. Build + lint green throughout (lint = the
documented pre-existing baseline, no new problems). Lighthouse: Perf 99 / A11y 100
/ BP 100 / SEO ~100 (prod).

**Items requiring David's follow-up:**
- **Apply DB migration** `20260522120000_add_user_locale` via `prisma migrate deploy`
  (Tasks 06/20). Until applied, `User.locale` persistence + DB-based post-login
  locale redirect are no-ops (graceful — URL/cookie locale still works). Login,
  portal and contact form keep working regardless.
- **Production deploy** (Tasks 17/18): add the two Vercel domains + DNS, set env
  (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `AUTH_URL`, etc.). Activates the
  host split (marketing ↔ portal) and makes canonical/sitemap use the real domain.
  See `DEPLOYMENT.md`.
- **Confirm canonical domain**: code uses `quantum-sphere.eu`; old code/email used
  `quantumsphere.eu` (no hyphen).
- **Native-speaker review** of all copy (`messages/*.json` carry `_TODO`); SK is the
  source draft, en/de/fr/sv are AI translations.
- **Portal translations** for de/fr/sv (currently English fallback, `_TODO_PORTAL_TRANSLATIONS`).
- **ContactSubmission model cleanup**: the generic enquiry form is mapped onto the
  legacy solar columns; add proper `phone`/`serviceType`/`message` columns later.
- **`User.language` vs `User.locale`** consolidation.
- **Pre-existing lint baseline** (2 errors, 2 warnings in portal files from stricter
  `eslint-config-next@16` rules) — decide whether to fix separately.
- **Analytics** not wired (no dependency present) — add if desired.
- **Re-run Lighthouse** on the live domain (confirms SEO ~100).

---

## Post-plan follow-ups (2026-05-23)

David confirmed: canonical domain = **quantum-sphere.eu**; analytics = **PostHog**.

### F1: Fix pre-existing lint baseline — ✅ Done
- Branch: `fix/lint-baseline`
- `npm run lint` now **clean (0 problems)**; build ✅; tests 57/57 ✅.
- Fixes: removed unused `t`/`getTranslations` (workers/[userId]/page.tsx) and unused `tCommon` (SectionsEditor.tsx); MyWagesView reset-on-range-change now via a `key` remount in `wages/page.tsx` (removed the reset effect, `react-hooks/set-state-in-effect`); documented `react-hooks/purity` disable on the intentional wall-clock `Date.now()` in TableLogger (24h edit-lock).

### F2: ContactSubmission model cleanup + domain email — ✅ Done (migration pending)
- Branch: `feat/contact-cleanup`
- Build ✅ / Lint clean ✅ / Tests 57/57 ✅.
- Replaced the legacy-column mapping with a proper model: `ContactSubmission { name, email, phone?, company?, serviceType, message, createdAt }`; `/api/contact` writes real columns. Migration `20260523110000_clean_contact_submission` created (NOT applied — **DESTRUCTIVE**, drops solar columns; see DEPLOYMENT.md).
- Fixed footer email `rfp@quantumsphere.eu` → `rfp@quantum-sphere.eu` (canonical domain confirmed).
- **Dependency:** contact form needs this migration applied before it works in prod (DEPLOYMENT.md step 0). Until then, submit errors — apply migrations before deploy.

### F3: Portal translations for de/fr/sv — ✅ Done
- Branch: `feat/portal-i18n-translations`
- Build ✅ / Lint clean ✅ / JSON valid (key parity with en, 0 placeholders).
- Translated the portal namespaces (`common`, `nav`, `login`, `projects`, `workers`, `changePassword`, `accommodations`, `wages`, `log`, `errors`, `error`) EN→DE/FR/SV via 3 parallel agents; deep-merged. ICU placeholders (`{count}`, `{password}`, `{amount}`, `{remaining}`) preserved; brand kept; removed the `_TODO_PORTAL_TRANSLATIONS` flags. Portal now fully localized in all 5 languages (still AI drafts — `_TODO` native review remains).

