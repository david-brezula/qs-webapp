# Clean & Modern Reskin — Design

**Date:** 2026-05-18
**Status:** Approved design, pending implementation plan

## Goal

Replace the current "editorial / Scandinavian magazine" visual identity with a
clean, modern, professional look across the whole app — public marketing site
and worker portal. The page layouts and structure stay; the colors, typography,
graphics, and decorative styling change.

## Background

The current design is a warm editorial style: beige "paper" background,
terracotta/teal accents, a serif display font (Fraunces), monospace decorative
labels, hand-drawn SVG illustrations, and editorial dressing ("Vol. 07",
"§ 01", "Plate / fig.", coordinate labels, hairline grids). The user finds the
typography, color palette, and illustrations/decoration unappealing and wants a
conventional clean-modern look instead. Layout and spacing are kept.

## Scope

In scope:

- New color palette (light/neutral + one blue accent).
- New typography (single clean sans-serif; drop the serif and monospace).
- Remove the editorial decoration.
- Redraw the SVG illustrations as flat, geometric graphics.
- Apply across the public site fully, and the worker portal fully.

Out of scope:

- No layout/structure/spacing changes (column structure, section order,
  whitespace rhythm stay as they are).
- No content/copy changes.
- No changes to application logic, data, routing, or i18n strings.

## Decisions

- **Direction:** clean & modern — white/light background, neutral grays, one
  blue accent.
- **Graphics:** the illustration slots are kept and filled with flat geometric
  graphics (not photography, not removed).
- **Scope:** public site fully + worker portal fully.
- **Approach:** token-first — redefine the design tokens once so the palette and
  fonts cascade app-wide, then a component pass for decoration removal and SVG
  redraws.

## 1. Color palette

Redefine the existing CSS custom properties in `app/globals.css` (the `@theme`
block). Token **names are kept** so every `var(--color-*)` reference and the
portal's legacy aliases update automatically; only the **values** change.

| Token | Current | New |
|---|---|---|
| `--color-paper` (page background) | `#F4EFE6` | `#FFFFFF` |
| `--color-canvas` (cards / surfaces) | `#FBF8F2` | `#F7F8FA` |
| `--color-paper-2` (alt section bg) | `#ECE5D7` | `#F1F3F5` |
| `--color-ink` (primary text) | `#161B22` | `#0F172A` |
| `--color-ink-2` | `#2A2F38` | `#1E293B` |
| `--color-slate` (secondary text) | `#5B6470` | `#475569` |
| `--color-mist` (muted text) | `#8A8F97` | `#94A3B8` |
| `--color-rule` (borders) | `#D8D1C2` | `#E2E8F0` |
| `--color-rule-soft` | `#E6DFD0` | `#EEF1F4` |
| `--color-fjord` (accent) | `#2E5E6E` | `#2563EB` |
| `--color-fjord-2` (accent hover) | `#1F4453` | `#1D4ED8` |
| `--color-ember` (accent) | `#B45A3C` | `#2563EB` |
| `--color-ember-2` (accent hover) | `#92482F` | `#1D4ED8` |
| `--color-moss` | `#5A6647` | `#2563EB` (retired → accent) |

Both former accents (`ember` terracotta, `fjord` teal) collapse to the single
blue `#2563EB`, so every existing accent usage becomes that blue with no
per-component edits.

The portal legacy aliases (`--color-bg`, `--color-surface`, `--color-navy`,
`--color-navy-700`, `--color-slate-ink`, `--color-border-soft`, `--color-accent`,
`--color-accent-ink`, `--color-muted`) are re-pointed to the same new values, so
the portal repaints automatically.

Other `globals.css` changes:

- Remove the paper-grain texture (the radial-gradient dot `background-image` on
  `body`) → flat white.
- `--radius-card`: `2px` → `8px` (subtle modern rounding). `--radius-pill` stays.
- `::selection` updates to the new ink/paper values (automatic via tokens).

## 2. Typography

In `app/layout.tsx`, drop the **Fraunces** and **JetBrains Mono** `next/font`
imports. Keep **Plus Jakarta Sans** as the single family for body and headings.

- `--font-display` → points to Plus Jakarta Sans (was Fraunces).
- `--font-mono` → removed; the `.numeral` utility keeps tabular figures via
  `font-feature-settings: "tnum"` on Plus Jakarta Sans.
- Headings: the `font-display` class and `font-display` heading styles drop the
  serif look — headings render as Plus Jakarta Sans at heavy weight (≈600–700)
  with tight tracking. Remove Fraunces-specific `fontVariationSettings`
  (`'SOFT'`, `'opsz'`) and italic-serif treatments.
- The `.eyebrow` utility loses its monospace styling and becomes a small
  uppercase sans-serif label with modest letter-spacing.

## 3. Decoration removed

The editorial dressing is removed:

- Hero: the metadata header strip (eyebrow + "Vol. 07 · DACH + Nordics
  edition"), the "Plate · sun disc + panel array / fig. 01" caption, and the
  decorative 12-column hairline grid background.
- `SectionHeading`: the `index` prop values ("§ 01"…"§ 05") — removed from the
  component and from the call sites.
- Stats: the "Specimen · operating record" and "YoY through Q1 2026" tags →
  removed or reduced to plain text.
- All in-SVG text labels: coordinates ("N 48°08′", "E 17°06′"), "HORIZON · 0.0",
  "PLATE 01 / VI", "QS · BTS", "fig. 01", "EU-NNN", "COVERAGE · 2026",
  "HQ · BRATISLAVA SK".
- Decorative hairline rules: the `h-px w-8` rule next to eyebrows, the
  `.rule-hair` element, purely decorative dashed lines.
- Footer: the monospace uppercase bottom bar becomes plain sans-serif.

Functional dividers and borders (section separators, table borders, list
dividers) are kept, rendered in the new neutral gray.

## 4. Graphics — redrawn flat & geometric

The illustration slots in the layout are kept and refilled with flat, geometric
graphics drawn in the new blue + neutral grays — no hand-drawn texture, dot
grids, tick marks, or in-SVG labels.

- **Hero visual** (`NorthernArt` in `Hero.tsx`): a clean flat composition — a
  simple geometric solar-panel / grid motif in blue and light gray.
- **Project-card art** (`ProjectArt` in `Projects.tsx`, 3 variants): flat
  geometric panel motifs, one per variant.
- **Coverage map** (the SVG in `Coverage.tsx`): a simplified flat radial graphic
  — a filled dot for the HQ, plain dots for the countries, light connector
  lines; no concentric dashed rings, no in-SVG monospace text (the country list
  beside the map already labels everything).
- **ContactCTA arcs** (the SVG in `ContactCTA.tsx`): replaced with a simple flat
  geometric accent or a solid blue panel.
- **Logo** (the 32×32 circle + crosshair SVG in `Nav.tsx` and `Footer.tsx`):
  already simple geometry — kept, with only minor cleanup if needed.

## 5. Components touched

- `app/globals.css` — tokens, fonts, remove grain texture, radius.
- `app/layout.tsx` — font imports.
- UI primitives — `components/ui/Button.tsx` (accent → blue; `ember` variant
  becomes blue), `Card.tsx`, `Container.tsx`, `SectionHeading.tsx` (drop `index`,
  drop serif heading style).
- Public — `components/Nav.tsx`, `components/Footer.tsx`, and all nine section
  components in `components/sections/` (`Hero`, `Capabilities`, `Certifications`,
  `ContactCTA`, `Coverage`, `Process`, `Projects`, `Stats`, `Testimonials`).
- Portal — repaints via the legacy-alias tokens automatically; plus a review
  pass over `components/portal/` (`Sidebar`, `TopBar`, `DataTable`,
  `ProjectLogView`, form components) and the `app/(app)/` pages to confirm
  nothing depended on the old warm palette and that headings adopt the new
  sans-serif heavy-weight style.

## 6. Build approach

Token-first, implemented in phases so each phase leaves the app working:

1. **Tokens & fonts** — `globals.css` + `app/layout.tsx`. After this the whole
   app is recolored and re-typed; some decoration still references removed
   concepts but nothing breaks.
2. **UI primitives** — `Button`, `Card`, `Container`, `SectionHeading`.
3. **Public sections + decoration removal** — `Nav`, `Footer`, the nine
   sections; remove editorial dressing, swap serif heading classes.
4. **SVG redraws** — the four illustrations.
5. **Portal pass** — verify and adjust `components/portal/` and `app/(app)/`.

## 7. Testing & verification

The change is presentational. Verification is:

- `npm run build` passes (all routes compile, no type errors).
- `npx tsc --noEmit` passes.
- The existing 25 vitest tests stay green (they are logic tests — contact
  schema, etc. — and are unaffected by styling).
- A Playwright visual sweep at desktop (~1280px) and mobile (~375px) across the
  public pages and the portal pages, confirming the new look renders correctly
  and there is no horizontal overflow or broken layout.

No new unit tests — there is no new logic, only styling.
