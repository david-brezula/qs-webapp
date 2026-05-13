# Quantum Sphere — Landing Page Design

**Date:** 2026-05-13
**Status:** Approved by user, ready for implementation planning

## Goal

Ship a single-route marketing landing page for **Quantum Sphere**, a B2B solar-construction subcontractor. The page must let a general contractor (GC) or solar EPC quickly evaluate whether to bring Quantum Sphere into a project: who they are, what they can build, where they operate, proof they're safe and qualified, and how to start an RFP.

## Audience & tone

- **Primary audience:** GCs and solar EPCs sourcing a subcontractor for utility-scale and C&I solar work.
- **Out of audience:** Homeowners / residential customers. No B2C copy or CTAs.
- **Tone:** Professional, capability-focused, low marketing-fluff. Numbers and certifications over adjectives.

## Approach

**Single long landing page (`/`) with anchored sections + a dedicated `/contact` route for the RFP form.**

Rationale: B2B contractors scan, they don't click through. Long-scroll with an anchor nav is faster than multi-page. The contact form gets its own route so the success state is clean and shareable.

**Alternatives rejected:**
- *Pure single page with inline contact form*: success state lives awkwardly above the footer.
- *Full multi-page site*: overkill for a launch landing page; more maintenance.

## Tech stack

- **Next.js 15** (App Router)
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **lucide-react** — icons
- **framer-motion** — subtle scroll-in animations only
- **next/font** — Inter, self-hosted via Google Fonts loader
- **No CMS, no DB.** Copy lives in `lib/content.ts`. Contact form posts to a Next.js route handler that logs and returns 200 — real email wiring is explicitly out of scope.

## Project structure

```
qs-web/
  app/
    layout.tsx              fonts, metadata, global shell
    page.tsx                landing — composes all sections
    contact/page.tsx        RFP form
    contact/thanks/page.tsx success state
    api/contact/route.ts    POST handler (logs, returns 200)
    globals.css             Tailwind + CSS vars for tokens
  components/
    Nav.tsx
    Footer.tsx
    sections/
      Hero.tsx
      Stats.tsx
      Capabilities.tsx
      Process.tsx
      Projects.tsx
      Certifications.tsx
      Coverage.tsx
      Testimonials.tsx
      ContactCTA.tsx
    ui/
      Button.tsx
      Container.tsx
      SectionHeading.tsx
      Card.tsx
  lib/
    content.ts              all placeholder copy
  public/
    panel-grid.svg          hero abstract visual
    us-map.svg              coverage map
    logos/*.svg             6 generic partner logo placeholders
```

## Visual system

| Token       | Value       | Use                                   |
|-------------|-------------|---------------------------------------|
| `--navy`    | `#0B1F3A`   | Primary brand color, headings, dark surfaces |
| `--slate`   | `#475569`   | Body text                             |
| `--bg`      | `#FAFAF7`   | Page background (warm white)          |
| `--surface` | `#FFFFFF`   | Cards                                 |
| `--border`  | `#E5E7EB`   | Dividers, card borders                |
| `--accent`  | `#F5B400`   | CTAs, stat numbers, hover states (used sparingly) |
| `--muted`   | `#94A3B8`   | Captions, secondary labels            |

- **Type:** Inter for all text. Display: tight tracking, `font-semibold`. Body: relaxed leading.
- **Grid:** 8px base. Section padding `py-24 md:py-32`. Max content width `max-w-6xl` centered.
- **Imagery:** All hand-built SVGs (panel-grid motifs, US map, abstract logos). No stock photos, no external image URLs.
- **Motion:** 300ms fade + 8px translate-up on scroll-in, once per section. No parallax, no autoplay video.

## Page sections (top → bottom)

1. **Nav (sticky, translucent on scroll)**
   - Logo (text "QUANTUM SPHERE" + small geometric mark)
   - Anchor links: Capabilities, Process, Projects, Coverage, Certifications
   - Right-aligned primary button: **Request capacity** → `/contact`

2. **Hero**
   - Headline: *"Solar subcontracting at utility scale."*
   - Sub: One-sentence value prop (placeholder).
   - Two CTAs: **Request capacity** (primary, → `/contact`) · **Download capabilities deck** (secondary, no-op for now)
   - Right side: abstract SVG (panel grid in navy on warm white)

3. **Stats bar**
   - 4 KPIs in a row: MW installed, projects completed, field crews available, EMR safety rating
   - Numbers in accent yellow, labels in slate

4. **Capabilities**
   - Section heading + intro line
   - 6-card grid (3 × 2): Rooftop · Ground-mount · Racking & structural · Electrical & BOS · Commissioning · O&M
   - Each card: lucide icon, title, 2-line description

5. **Process**
   - 5-step horizontal timeline: Scope → Mobilize → Install → Commission → Handoff
   - On mobile, collapses to vertical
   - Each step: number, title, one-line description

6. **Project portfolio**
   - 6 placeholder project cards in a responsive grid
   - Each: SVG hero (geometric), size (kW/MW), location (state), scope-of-work tag, role played
   - Not filterable in v1

7. **Certifications & safety**
   - Single row of 5 items: NABCEP, OSHA-30, state license #, EMR figure, insurance limits
   - Compact, factual, no card chrome — feels like a spec sheet

8. **Service coverage**
   - SVG US map with 12 states highlighted in navy
   - Right side: list of state names + a "Mobilizing nationwide" note

9. **Testimonial + partner logos**
   - One pull-quote from a "GC partner" (anonymized placeholder)
   - Logo strip below: 6 generic SVG partner logos

10. **Contact CTA band**
    - Full-bleed navy band
    - Headline: *"Subcontract with us."*
    - Single button: **Start an RFP** → `/contact`

11. **Footer**
    - Small print: address (placeholder), phone (placeholder), email (placeholder)
    - Repeat nav links
    - Copyright + small "Built for solar EPCs" tag

## `/contact` route

- Header + back link to `/`
- RFP form fields (all client-validated):
  - Company (required, text)
  - Your name (required, text)
  - Email (required, email)
  - Project type (required, select: Rooftop / Ground-mount / Other)
  - System size in MW (required, number, > 0)
  - Project state (required, US state select)
  - Target start date (required, date picker)
  - Scope needed (required, multi-select checkboxes mirroring capabilities)
  - Notes (optional, textarea)
- Submit → POST `/api/contact` → on 200, router push to `/contact/thanks`
- On validation error: inline messages, no submit
- On network error: inline banner above form

`/contact/thanks` — simple confirmation page with a link back to `/`.

`/api/contact` — accepts JSON, validates with zod, logs to `console.log`, returns `{ ok: true }`. No email, no DB.

## Accessibility

- Semantic landmarks (`<header>`, `<main>`, `<section>` with `aria-labelledby`, `<footer>`)
- All interactive elements keyboard-reachable; visible focus rings (`focus-visible:ring-2 ring-accent`)
- Color contrast: navy on warm-white ≥ 7:1; accent yellow only on navy backgrounds where ≥ 4.5:1
- Form labels associated with inputs; errors announced via `aria-live="polite"`
- Motion respects `prefers-reduced-motion` (animations disabled)

## Out of scope

- Real email delivery, SMTP / SendGrid / Resend wiring
- CRM or ticket system integration
- CMS or admin UI
- i18n / multi-language
- Analytics, tracking pixels
- Cookie consent banner
- Real photography, real client logos, real testimonial sourcing
- Blog, news, careers pages
- Sitemap, robots.txt tuning beyond Next.js defaults
- E2E tests (unit tests on the contact form validator only)

## Success criteria

- `pnpm dev` (or `npm run dev`) starts a working site at `localhost:3000`
- Landing page renders all 11 sections with placeholder content, no console errors
- Anchor nav scrolls smoothly to sections
- `/contact` form validates, submits, redirects to thanks page on success
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95 on the landing route
- Renders cleanly at 360px, 768px, 1280px, 1920px widths
- All copy editable in `lib/content.ts` without touching component code
