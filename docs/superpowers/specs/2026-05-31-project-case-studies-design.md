# Project case studies — design

**Date:** 2026-05-31
**Status:** Approved (brainstorm) → ready for implementation plan

## Goal

Turn the homepage "Selected projects" cards into clickable, blog-style **case
study** pages that explain, per project, what the brief was, what we did, how we
did it, and the outcome — to build credibility ("proof"). Add a dedicated
`/projects` listing page and a main-nav entry. All five locales (sk, en, de, fr,
sv).

## Honesty constraint (carried from prior decisions)

These are **representative** case studies, not records of specific signed
contracts. They carry **no invented client names, testimonial quotes,
certifications-as-fact, or audited result figures**. Content describes scope and
methodology truthfully to how a competent multi-trade contractor works.

Tense is honest to status:

- `completed` → past tense, includes an **Outcome** section.
- `inProgress` → present tense; **Current status** section instead of Outcome
  (no claimed finished result).
- `planned` → future tense; **What we'll deliver** section, no Outcome.

Existing developer guardrail ("replace with real projects + photos before
launch") is preserved and extended to the new content and copy.

## Non-goals (YAGNI)

- No MDX / new content toolchain — content stays in `messages/*.json`.
- No per-project generated OpenGraph image route (reuse the project photo via
  `openGraph.images`). Trade-style `opengraph-image.tsx` can come later.
- No multiple-image galleries per project in v1 (single hero photo each).
- No CMS/database; portfolio remains static.

## Approach

Follow the **existing trade-page pattern** exactly (`ServicePage` +
`services.<slug>` message namespace with `deliverables.items` / `process.steps`).
Structural facts live in `lib/projects.ts`; all localized text lives in messages.
No new dependencies.

## Architecture / data flow

```
lib/projects.ts            structural data: key, slug, trade, status, year
lib/marketingImages.ts     PROJECT_IMAGE[key]  (already populated)
messages/<locale>.json     projects.* namespace (labels + per-project content)
        │
        ▼
app/[locale]/(marketing)/projects/page.tsx          → <ProjectsIndex/>
app/[locale]/(marketing)/projects/[slug]/page.tsx   → <ProjectCaseStudy slug/>
        │                                                     │
        ▼                                                     ▼
components/marketing/ProjectGrid.tsx (shared)        components/marketing/ProjectCaseStudy.tsx
   used by Portfolio (home) + ProjectsIndex             reuses ServicePage primitives
```

## Data model — `lib/projects.ts`

```ts
export type FeaturedProject = {
  key: string;          // message key + PROJECT_IMAGE key (unchanged)
  slug: string;         // URL slug, STABLE across locales (kebab-case)
  trade: ServiceSlug;
  status: ProjectStatus;
  year?: string;        // illustrative, e.g. "2024"
};
```

Add `getProjectBySlug(slug): FeaturedProject | undefined` and
`PROJECT_SLUGS: string[]` helper. Slugs (stable):

| key | slug |
|---|---|
| solarFarm | rooftop-solar-power-plant |
| groundMountSolar | ground-mounted-solar-park |
| retailWiring | retail-electrical-fit-out |
| evChargingHub | ev-charging-hub |
| warehousePower | warehouse-power-and-lighting |
| officeFitout | office-drywall-fit-out |
| clinicFitout | outpatient-clinic-fit-out |
| apartmentReroof | apartment-block-reroof |
| retainingWall | reinforced-retaining-wall |
| industrialRoof | industrial-hall-reroofing |
| brickFacade | brick-facade-and-masonry |
| solarCarport | solar-carport-with-ev-charging |

## Routing — `lib/i18n/routing.ts`

**Internal path is `/work`, NOT `/projects`** — the portal already owns
`/projects` (it's in `proxy.ts` `PORTAL_PATHS`, auth-gated and host-redirected),
and two `page.tsx` resolving to `/[locale]/projects` would collide. Only the
prefix localizes; `[slug]` is stable:

```ts
"/work": { sk: "/realizacie", en: "/case-studies", de: "/projekte",
           fr: "/realisations", sv: "/projekt" },
"/work/[slug]": { sk: "/realizacie/[slug]", en: "/case-studies/[slug]",
           de: "/projekte/[slug]", fr: "/realisations/[slug]",
           sv: "/projekt/[slug]" },
```

`alternatesForPathname` can't expand `[slug]`; add a helper that builds
alternates from `localizedPathname("/work", loc) + "/" + slug` for each locale
(canonical = current locale). Links use `href="/work"` and
`href={{ pathname: "/work/[slug]", params: { slug } }}`.

## Routes

### `app/[locale]/(marketing)/work/page.tsx`
- `generateMetadata` → title/description from `projects.meta`, alternates for
  `/work`.
- `setRequestLocale(locale)`; render `<ProjectsIndex/>`.

### `app/[locale]/(marketing)/work/[slug]/page.tsx`
- `generateStaticParams()` → `PROJECT_SLUGS.map(slug => ({ slug }))` (locale from
  parent).
- `generateMetadata({ params })` → look up project by slug; `notFound()` if
  missing; `title` = item `title`, `description` = item `summary`;
  `openGraph.images = [PROJECT_IMAGE[key]]`; per-project alternates.
- `setRequestLocale(locale)`; render `<ProjectCaseStudy slug={slug}/>`.

## Components

### `components/marketing/ProjectGrid.tsx` (new, client)
Extracted from `Portfolio.tsx`: the trade-filter tabs + animated card grid.
Props: `{ projects?: FeaturedProject[] }` (defaults to all). Each card is wrapped
in `<Link href={{ pathname: "/projects/[slug]", params: { slug } }}>` and gains a
hover affordance + "View case study →" cue. Reads card copy from
`projects.items.<key>` (`title`, `location`, `summary`) and section labels from
`projects.index` / `home.featuredProjects.status`.

### `components/marketing/Portfolio.tsx` (edit)
Becomes a thin homepage section wrapper: `SectionHeading` + `<ProjectGrid/>`.
Keeps homepage heading copy.

### `components/marketing/ProjectsIndex.tsx` (new)
`/projects` page body: heading from `projects.index` + `<ProjectGrid/>` +
`ContactCta`. BreadcrumbList JSON-LD (Home / Projects).

### `components/marketing/ProjectCaseStudy.tsx` (new)
Mirrors `ServicePage` structure and styling, wrapped in `tradeAccent(trade)`:

1. Trade-colour top bar + breadcrumb (Home / Projects / title) — localized links.
2. **Hero** — trade badge + name, `h1` title, meta row (location · year · status
   badge), hero `TradeImage` (`PROJECT_IMAGE[key]`, `priority`).
3. **Overview** — lead paragraph (`overview`).
4. **The brief** — `challenge` (renders if present).
5. **What we did** — `scope[]` checklist (deliverables styling).
6. **How we did it** — `process[]` numbered steps (process styling).
7. **Outcome / Current status / What we'll deliver** — `outcome`, heading chosen
   by status.
8. **Project at a glance** — facts table: trade, location, year, status, plus
   any `facts{}` entries (e.g. capacity, area). Labels from `projects.detail`.
9. **Related projects** — up to 3 other projects of the **same trade** (fallback
   to any if fewer than 3), as compact linked cards.
10. **ContactCta**.
- JSON-LD: BreadcrumbList only (no over-claiming CreativeWork).
- All array sections render only when non-empty (defensive, like `ServicePage`).

### `components/marketing/MarketingHeader.tsx` (edit)
Add a "Projects" link (`<Link href="/projects">`) between Services and About in
both desktop and mobile nav, using a **new** key `nav.work` (label tuned per
locale; distinct from portal's `nav.projects`).

## Content schema — `messages/<locale>.json`

New top-level `projects` namespace:

```jsonc
"projects": {
  "meta": { "title": "...", "description": "..." },      // /projects index <title>
  "index": { "title": "...", "subtitle": "..." },         // index heading
  "backLabel": "Back to projects",
  "viewCase": "View case study",
  "detail": {
    "overviewTitle": "Overview",
    "challengeTitle": "The brief",
    "scopeTitle": "What we did",
    "processTitle": "How we did it",
    "outcomeTitle": "Outcome",
    "statusTitleInProgress": "Current status",
    "statusTitlePlanned": "What we'll deliver",
    "factsTitle": "Project at a glance",
    "relatedTitle": "Related projects",
    "facts": { "trade": "Trade", "location": "Location", "year": "Year",
               "status": "Status" }
  },
  "items": {
    "<key>": {
      "title": "...", "location": "...",
      "summary": "...",          // = current card body
      "overview": "...",
      "challenge": "...",
      "scope": ["...", "..."],
      "process": [{ "title": "...", "body": "..." }],
      "outcome": "..."
    }
  }
}
```

`year` is NOT in messages — it lives in `lib/projects.ts` (structural data) to
avoid duplication across locales.

Migration: per-project `title`/`location`/`summary` move from
`home.featuredProjects.items` into `projects.items` (the old `items` sub-key is
deleted). `home.featuredProjects` keeps `title`/`subtitle`/`allLabel`/`status`
(section chrome, still used by `ProjectGrid` for status labels and the homepage
heading). Add `nav.work`.

"Project at a glance" facts table = the four standard facts only (trade,
location, year, status), each fully localized via `detail.facts.*` /
service names / status labels. Per-project freeform facts were dropped (YAGNI):
the capacity/area figures already appear in the prose, and an object-keyed model
would have leaked English labels into other locales.

## SEO

- Per-locale hreflang alternates for each `/projects/<slug>` (self-referencing
  canonical), same approach as trade pages.
- `openGraph.images` = project photo.
- BreadcrumbList JSON-LD on index and detail.

## Testing / verification

- `npx tsc --noEmit` clean.
- `npx eslint` clean on changed files.
- Message parity script: all 5 locales expose identical `projects.items.<key>`
  key sets and identical `projects.detail` keys; every project key present in all
  locales and matches `FEATURED_PROJECTS` / `PROJECT_IMAGE`.
- `next build` succeeds; spot-check `generateStaticParams` produces 12 slugs ×
  5 locales = 60 detail pages.
- Manual: homepage card → detail navigation works in a non-default locale (e.g.
  `/de/projekte/ev-charging-hub`); language switch preserves the project.

## Risks / mitigations

- **Content volume** (12 × full content × 5 languages) is the bulk of the work —
  write per-locale in batches; verify parity with the script.
- **next-intl typed Link with dynamic params** — confirm `href={{ pathname,
  params }}` compiles against the generated route types; if friction, fall back
  to building the href via `getPathname`.
- **Migration churn** in 5 message files — mechanical; parity script guards it.

## File change summary

New:
- `app/[locale]/(marketing)/work/page.tsx`
- `app/[locale]/(marketing)/work/[slug]/page.tsx`
- `components/marketing/ProjectGrid.tsx`
- `components/marketing/ProjectsIndex.tsx`
- `components/marketing/ProjectCaseStudy.tsx`

Edit:
- `lib/projects.ts` (slug/year/helpers)
- `lib/i18n/routing.ts` (pathnames)
- `lib/seo.ts` (per-project alternates helper)
- `components/marketing/Portfolio.tsx` (use ProjectGrid)
- `components/marketing/MarketingHeader.tsx` (nav link)
- `messages/{sk,en,de,fr,sv}.json` (projects namespace + nav.work; migrate item copy)
