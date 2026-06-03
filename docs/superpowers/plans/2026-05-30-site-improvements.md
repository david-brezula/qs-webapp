# Site Improvements Implementation Plan — Quantum Sphere

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the confirmed Legal, SEO, Marketing, Design, and Animation gaps on the Quantum Sphere marketing site without disturbing the parts already done well.

**Architecture:** Next 16 App Router, `app/[locale]/(marketing)` route group, content in `messages/*.json` (5 locales: sk/en/de/fr/sv), localized routing via `lib/i18n/routing.ts`, metadata helpers in `lib/seo.ts`. New legal pages mirror the existing `privacy/page.tsx` pattern; structured data is a new server component emitting JSON-LD.

**Tech Stack:** Next 16.2.6, React 19, next-intl 4, Tailwind 4, TypeScript, Vitest, lucide-react, PostHog (already consent-gated).

---

## Audit summary (verified 2026-05-30)

**Already correct — do NOT redo:**
- `app/robots.ts` disallows `/api/` + every portal route + login/change-password. ✅
- Per-page `generateMetadata` with localized title/description + `alternatesForPathname` (self-referencing canonical + hreflang `languages`). ✅
- Per-route `opengraph-image.tsx` on home + each service via `lib/og.tsx`. ✅
- **Analytics consent gating is correctly implemented.** `PostHogProvider` only calls `posthog.init`/`opt_in_capturing` when `qs_consent === "granted"`, and `opt_out_capturing()` + `reset()` on `"denied"`; the banner only appears while consent is `"unset"`. Privacy-policy claim matches code. ✅ **No work needed.**
- Footer already renders legal identity: company name, IČO, IČ DPH (VAT), registration, address, phone, email (from `lib/content.ts` `FOOTER`). ✅
- `prefers-reduced-motion` block already present in `app/globals.css`. ✅
- Privacy + Cookies legal pages exist; privacy policy is thorough (GDPR articles + Slovak DPA). ✅
- Service pages already render an FAQ (`services.<slug>.faq.items`) — content exists, just not emitted as schema. ✅

**Confirmed gaps (this plan):**

| # | Area | Gap | Severity |
|---|------|-----|----------|
| G0 | Legal | `lib/content.ts` `FOOTER` ships **live placeholder values** (`companyId: "__ICO_PLACEHOLDER__"`, registration `__OR_SUD/_ODDIEL/_VLOZKA_PLACEHOLDER__`) — these render in the footer in production today | HIGH |
| G1 | Legal | No dedicated **Impressum/Imprint page** (DE §5 DDG wants a discrete, reachable page; footer microdata isn't sufficient) | HIGH |
| G2 | Legal | No **Terms / business-conditions** page | MED |
| G3 | SEO | **Zero JSON-LD** anywhere (no Organization, LocalBusiness, Service, BreadcrumbList) | HIGH |
| G4 | SEO | Service-page FAQs not emitted as **FAQPage** schema (content already exists) | MED |
| G5 | SEO | `app/sitemap.ts` entries lack per-URL **hreflang alternates** | MED |
| G6 | SEO | `NEXT_PUBLIC_SITE_URL` not set in env files (relies on hardcoded fallback) | LOW |
| G7 | Marketing | No social proof (testimonials/certifications), no sticky/secondary conversion path | MED — needs brainstorm |
| G8 | Design | Hero & service pages are text-only (deliberate "blueprint" aesthetic); no imagery / trust band | MED — needs brainstorm |
| G9 | Animation | No entrance/scroll-reveal motion (framer-motion installed but unused) | LOW — needs brainstorm |

**Phases 1–2 below are code-complete and ready to execute.** Phases 3–5 (G7–G9) require design/brand decisions and a content/asset source; they are scoped as a backlog and should each get their own `superpowers:brainstorming` → `writing-plans` cycle before coding. Do not implement them from this document.

---

## Phase 1 — Legal pages

### Task 1: Impressum / Imprint page

**Files:**
- Create: `app/[locale]/(marketing)/impressum/page.tsx`
- Modify: `lib/i18n/routing.ts` (add `/impressum` to `pathnames` with localized slugs)
- Modify: `messages/sk.json`, `messages/en.json`, `messages/de.json`, `messages/fr.json`, `messages/sv.json` (add `legal.impressum` namespace + a `footer.impressum` label)
- Modify: `components/marketing/MarketingFooter.tsx` (add the legal link)
- Modify: `app/sitemap.ts` (add `/impressum` to `MARKETING_PATHS`)

- [ ] **Step 1: Add the localized route to `lib/i18n/routing.ts`.** In the `pathnames` object, mirror the slug style already used for `/privacy` and `/cookies`, e.g.:

```ts
"/impressum": {
  sk: "/impressum",
  en: "/legal-notice",
  de: "/impressum",
  fr: "/mentions-legales",
  sv: "/impressum",
},
```

- [ ] **Step 2: Add the `legal.impressum` content to every `messages/*.json`.** Keys: `meta.title`, `meta.description`, `heading`, and a `sections` array of `{ heading, body }`. Cover the §5 DDG fields. Pull the real values that already live in `lib/content.ts` `FOOTER` (company name, IČO, IČ DPH, registration, address, phone, email) where known; use clearly-marked `[TODO: …]` only for fields not yet in the repo (managing director, register court/section, supervisory authority for the trade). German wording must satisfy §5 DDG ("Angaben gemäß § 5 DDG").

- [ ] **Step 3: Create the page, mirroring `app/[locale]/(marketing)/privacy/page.tsx` exactly** (same `generateMetadata` shape — `getTranslations({ locale, namespace: "legal.impressum.meta" })` for title/description plus `alternates: alternatesForPathname("/impressum", locale)` — and the same content-rendering structure that `privacy/page.tsx` uses to map its `sections`). Reuse the privacy page's layout/components; do not invent a new layout.

- [ ] **Step 4: Add the footer link** in `components/marketing/MarketingFooter.tsx`, in the legal links row next to privacy/cookies:

```tsx
<Link href="/impressum" className="hover:text-[var(--color-ink)] transition-colors">
  {tf("impressum")}
</Link>
```

- [ ] **Step 5: Add `/impressum` to `MARKETING_PATHS` in `app/sitemap.ts`.**

- [ ] **Step 6: Verify build + routes.** Run: `npm run build`. Expected: PASS, with `/[locale]/impressum` (localized slugs) prerendered for all 5 locales. Manually load each locale and confirm the footer link resolves and hreflang alternates are present in `<head>`.

- [ ] **Step 7: Commit.**

```bash
git add lib/i18n/routing.ts "app/[locale]/(marketing)/impressum/page.tsx" app/sitemap.ts components/marketing/MarketingFooter.tsx messages/*.json
git commit -m "feat(legal): add Impressum/legal-notice page in all locales"
```

### Task 2: Terms / business-conditions page

**Files:** same set as Task 1 but for `/terms`.

- [ ] **Step 1:** Add `/terms` to `pathnames` in `lib/i18n/routing.ts` (sk: `/obchodne-podmienky`, en: `/terms`, de: `/agb`, fr: `/conditions-generales`, sv: `/villkor`).
- [ ] **Step 2:** Add `legal.terms` namespace to all `messages/*.json` (same `meta`/`heading`/`sections` shape as Task 1). Cover: scope of services, quotation & contract formation, pricing/payment, warranty & liability, EU consumer withdrawal rights, governing law (Slovak). Use `[TODO: …]` for any owner-specific clauses.
- [ ] **Step 3:** Create `app/[locale]/(marketing)/terms/page.tsx` mirroring `privacy/page.tsx` (namespace `legal.terms.meta`, `alternatesForPathname("/terms", locale)`).
- [ ] **Step 4:** Add footer link `{tf("terms")}` → `/terms`.
- [ ] **Step 5:** Add `/terms` to `MARKETING_PATHS` in `app/sitemap.ts`.
- [ ] **Step 6:** `npm run build` → PASS; load each locale; confirm link + hreflang.
- [ ] **Step 7:** Commit: `feat(legal): add Terms / business conditions page in all locales`.

---

## Phase 2 — SEO

### Task 3: Structured data (JSON-LD) builders + component

**Files:**
- Create: `lib/schema.ts`
- Create: `components/seo/JsonLd.tsx`
- Test: `lib/schema.test.ts`

- [ ] **Step 1: Write failing tests** in `lib/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { organizationSchema, localBusinessSchema, serviceSchema, breadcrumbSchema } from "./schema";

describe("schema builders", () => {
  it("organization has required fields", () => {
    const s = organizationSchema("https://quantum-sphere.eu");
    expect(s["@type"]).toBe("Organization");
    expect(s.name).toBe("Quantum Sphere s.r.o.");
    expect(s.url).toBe("https://quantum-sphere.eu");
    expect(typeof s.logo).toBe("string");
  });

  it("localBusiness carries a postal address and telephone", () => {
    const s = localBusinessSchema("https://quantum-sphere.eu");
    expect(s["@type"]).toBe("GeneralContractor");
    expect(s.address["@type"]).toBe("PostalAddress");
    expect(s.telephone).toBeTruthy();
  });

  it("service links to its provider and area", () => {
    const s = serviceSchema("solar", "Solárne elektrárne", "https://quantum-sphere.eu", "sk");
    expect(s["@type"]).toBe("Service");
    expect(s.serviceType).toBe("Solárne elektrárne");
    expect(s.provider["@type"]).toBe("Organization");
  });

  it("breadcrumb lists positioned items", () => {
    const s = breadcrumbSchema([
      { name: "Domov", url: "https://quantum-sphere.eu/sk" },
      { name: "Solár", url: "https://quantum-sphere.eu/sk/solar" },
    ]);
    expect(s.itemListElement[1].position).toBe(2);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run lib/schema.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `lib/schema.ts`.** Pull org identity from `lib/content.ts` `FOOTER` (do not re-hardcode). Hand-type plain objects (no `schema-dts` dependency needed). Use `GeneralContractor` (a `LocalBusiness` subtype) for the trades business. Include `sameAs: []` (wire real profile URLs when provided), `address` (PostalAddress from `FOOTER.address`), `telephone` (`FOOTER.email`/`phone`), and `areaServed`.

- [ ] **Step 4: Run** `npx vitest run lib/schema.test.ts` → PASS.

- [ ] **Step 5: Create `components/seo/JsonLd.tsx`** — a server component:

```tsx
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

- [ ] **Step 6: Commit:** `feat(seo): add JSON-LD schema builders + JsonLd component`.

### Task 4: Emit Organization + LocalBusiness sitewide, Service + Breadcrumb on service pages

**Files:**
- Modify: `app/[locale]/(marketing)/layout.tsx`
- Modify: `components/marketing/ServicePage.tsx`

- [ ] **Step 1:** In `app/[locale]/(marketing)/layout.tsx`, render `<JsonLd data={[organizationSchema(siteUrl), localBusinessSchema(siteUrl)]} />` (compute `siteUrl` from `process.env.NEXT_PUBLIC_SITE_URL ?? "https://quantum-sphere.eu"` — the existing fallback).
- [ ] **Step 2:** In `components/marketing/ServicePage.tsx`, add `<JsonLd data={[serviceSchema(slug, t("name"), siteUrl, locale), breadcrumbSchema([...])]} />`. Get `locale` via `useLocale()` (next-intl). Breadcrumb = Home → service.
- [ ] **Step 3: Verify** with the Google Rich Results Test (or schema.org validator) on the home page and one service page. Expected: Organization, LocalBusiness, Service, BreadcrumbList all valid, no errors.
- [ ] **Step 4: Commit:** `feat(seo): emit Organization/LocalBusiness/Service/Breadcrumb JSON-LD`.

### Task 5: FAQPage schema on service pages (FAQ content already exists)

**Files:** Modify `components/marketing/ServicePage.tsx`.

- [ ] **Step 1:** Where `faqs` is already built (`t.raw("faq.items")`), when `faqs.length > 0` also render:

```tsx
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }}
/>
```

- [ ] **Step 2: Verify** FAQPage validates in Rich Results Test for a service page. **Commit:** `feat(seo): add FAQPage schema to service pages`.

### Task 6: Sitemap hreflang alternates

**Files:** Modify `app/sitemap.ts`.

- [ ] **Step 1:** For each entry, add an `alternates.languages` map built from the same slug-resolution logic already in the file (reuse the `routing.pathnames` lookup). `MetadataRoute.Sitemap` supports `alternates: { languages: Record<locale, url> }`.
- [ ] **Step 2: Verify** `/sitemap.xml` (run `npm run dev`, fetch it) contains `<xhtml:link rel="alternate" hreflang="…">` for every URL. **Commit:** `feat(seo): add hreflang alternates to sitemap entries`.

### Task 7: Explicit SITE_URL env

**Files:** Modify `.env.production`, `.env.example`.

- [ ] **Step 1:** Add `NEXT_PUBLIC_SITE_URL=https://quantum-sphere.eu` to `.env.production`; document it in `.env.example`. Keep the hardcoded fallback as defence-in-depth.
- [ ] **Step 2: Verify** `npm run build` emits canonical/OG/sitemap URLs from the env value. **Commit:** `chore(seo): set NEXT_PUBLIC_SITE_URL explicitly`.

---

## Phase 3 — Marketing (backlog — brainstorm before coding)

- **Social proof:** testimonials + certifications/guarantees band on home + service pages. Emit `Review`/`AggregateRating` JSON-LD **only with real data** — never fabricate ratings.
- **Conversion:** sticky mobile "request a quote" CTA; service pages deep-link to the contact form pre-filled with the trade.
- **Lead capture (optional):** quote-callback form via the existing `nodemailer` setup, mirroring the contact form's validation + honeypot, consent-respecting.

## Phase 4 — Design (backlog — brainstorm before coding)

The current aesthetic is a deliberate, clean editorial/"blueprint" system (CSS vars: `--color-ink/fjord/paper/canvas`) — it is NOT generic. Opportunities, pending brand/asset decisions: real hero/project imagery, an above-the-fold trust signal, a projects/gallery section, service-card visual polish. Use the `frontend-design` skill for execution.

## Phase 5 — Animation (backlog — brainstorm before coding)

framer-motion is installed but unused. Add a single shared `Reveal` wrapper (scroll-reveal, `useReducedMotion`-guarded), count-up on any stats, subtle button/card micro-interactions. Transform/opacity only; no CLS; honour the existing `prefers-reduced-motion` CSS.

---

## Self-review notes
- Spec coverage: G1–G6 each map to a task (Phase 1–2). G7–G9 deferred to backlog by design (need decisions/assets).
- No fabricated facts: org data sourced from `lib/content.ts`; ratings explicitly gated on real data.
- Type consistency: `JsonLd`, `organizationSchema`, `localBusinessSchema`, `serviceSchema`, `breadcrumbSchema` used with the same signatures across Tasks 3–5.

## Open inputs needed from owner
- Managing director name, commercial-register court/section, trade supervisory authority (Task 1).
- Social profile URLs for `sameAs` (Task 3).
- Geo coordinates / opening hours, if you want them in LocalBusiness (Task 3).
- Real testimonials/certifications + any imagery (Phases 3–4).
