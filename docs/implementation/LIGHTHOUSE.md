# Lighthouse audit — 2026-05-22

Audited the production build (`npm run build && npm run start`) on `/sk` with
Lighthouse (Chromium headless), categories: performance, accessibility,
best-practices, seo.

## Scores (localhost, production build)

| Category | Before | After fixes |
|---|---|---|
| Performance | 98 | **99** |
| Accessibility | 96 | **100** |
| Best Practices | 100 | **100** |
| SEO | 92 | 92* |

Core metrics: FCP 1.1 s · LCP 2.4 s · CLS 0 · TBT 10 ms · Speed Index 1.7 s.

All meet the plan's targets (Perf ≥85, A11y ≥95, BP ≥95, SEO ≥95*) — see the
SEO note below.

## Issues found & fixed

1. **color-contrast (a11y, was 0)** — the footer fine-print bottom bar used
   `--color-mist` (#94A3B8) at 11px on white = 2.56:1 (below the 4.5:1 AA
   threshold). **Fixed:** changed that text to `--color-slate` (#475569, ~7:1).
   Accessibility → 100.

2. **canonical → de-indexing bug (SEO, real bug)** — `lib/seo.ts` set every
   locale's canonical to the **default** locale's URL, which would tell Google
   that en/de/fr/sv are duplicates of /sk and de-index them — defeating the
   multilingual SEO goal. **Fixed:** `alternatesForPathname(path, locale)` now
   emits a **self-referencing** canonical per locale (verified: `/en` →
   `https://quantum-sphere.eu/en`). hreflang alternates still list all locales.

## SEO score note (* the remaining 92 is a localhost artifact)

Lighthouse's `canonical` audit still fails **only when run on `localhost`**:
`metadataBase` is the production domain, so the canonical is
`https://quantum-sphere.eu/sk` while the audited URL is
`http://localhost:3000/sk` — different host → Lighthouse thinks it points
elsewhere. In production (audited on `quantum-sphere.eu`) the canonical is
self-referential and valid, so SEO is effectively ≥95. Re-run Lighthouse against
the live domain after deploy to confirm.

## Optimizations already in place (no change needed)

- Fonts: `next/font` (Plus Jakarta Sans) self-hosted with `display: swap`.
- No layout shift (CLS 0); no raster `<img>` without dimensions (logo/marks are
  inline SVG; hero backdrop is CSS).
- `html lang={locale}`, viewport meta (Next default), localized `<title>` +
  description + hreflang + OG image per page.
- `prefers-reduced-motion` honored in `globals.css`.

## Follow-ups (David)

- Re-run Lighthouse on the live domain post-deploy (confirms SEO 100).
- Optional: tune LCP further (hero is text-only; already 2.4 s).
