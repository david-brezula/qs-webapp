# Mobile Optimization — Full Responsive Pass

**Date:** 2026-05-17
**Status:** Approved design, pending implementation plan

## Goal

Make both the public marketing site and the internal worker portal work well on
phone (~360–430px) and small-tablet (~768px) widths. The public site is already
structurally responsive and needs polish; the portal has one real gap — no
navigation on mobile — plus a few overflowing form rows.

## Scope

In scope:

- A mobile navigation drawer for the portal.
- Class-level responsive fixes on the public site and portal forms.
- Visual verification at 375px and 768px.

Out of scope:

- No shared responsive design-system / token refactor (UI primitives are already
  adequate).
- `DataTable` keeps its existing horizontal scroll (`overflow-x-auto`) — an
  accepted pattern for wide tables.
- No changes to server logic, data models, or i18n strings beyond reusing the
  existing `nav` translation keys.

## Decisions

- **Portal mobile nav:** hamburger drawer (consistent with the public `Nav`
  pattern; scales to the 5 admin destinations, unlike a bottom tab bar).
- **Wide tables:** keep horizontal scroll, no card layout.
- **Target widths:** down to ~360px phones and ~768px tablets.

## 1. Portal mobile navigation

The portal `Sidebar` is `hidden md:flex` and `TopBar` has no menu trigger, so
mobile users currently have no navigation. This is the only net-new component.

### `lib/portal-nav.ts` (new)

Extract the nav items so the menu is defined once:

```ts
export function getPortalNavItems(role: "ADMIN" | "WORKER"):
  { href: string; labelKey: string }[]
```

- ADMIN: dashboard, projects, workers, accommodations, wages.
- WORKER: dashboard.
- `labelKey` is the existing `nav` translation key; each consumer maps it with
  its own `useTranslations("nav")`.

### `components/portal/MobileNav.tsx` (new, client)

- Owns `open` state.
- Renders a hamburger button (`md:hidden`, lucide `Menu` / `X`) with
  `aria-label` and `aria-expanded`.
- Renders a left slide-in drawer plus a dimmed backdrop (`md:hidden`), reusing
  the "PORTAL" brand header and the shared nav items.
- Closes on: link click, backdrop click, and `Escape`.
- Mirrors the existing public `Nav` mobile-menu pattern: conditional render with
  aria attributes; no full focus-trap (kept consistent with current code).

### `components/portal/TopBar.tsx` (modified)

- Accepts a `role` prop.
- Renders `<MobileNav role={role} />` on the left side.

### `app/(app)/layout.tsx` (modified)

- Passes `user.role` to `TopBar` (already available in the layout).

### `components/portal/Sidebar.tsx` (modified)

- Switches to `getPortalNavItems` — no visual change.

### Active-link highlight

Both `Sidebar` and the drawer highlight the current route via `usePathname()`.
Small addition, improves orientation on mobile.

## 2. Public site responsive fixes (class-level only)

- **`components/sections/ContactCTA.tsx`** — the ~700px decorative SVG can
  trigger horizontal page scroll on phones; clamp its size or hide below `sm`.
  *(Real bug — highest priority on the public site.)*
- Scale down oversized mobile typography: `ContactCTA` headline, `Testimonials`
  blockquote, `Stats` numeral, `Hero` headline, contact `thanks` headline.
- Density tweaks: `Hero` credential grid, `Capabilities` icon size, `Projects`
  card padding, `Certifications` label-column breakpoint for tablet widths.

## 3. Portal form fixes (class-level only)

- **`AccommodationForm.tsx`** — `grid-cols-2` date and cost/currency rows →
  `grid-cols-1 sm:grid-cols-2`.
- **`WagesView.tsx`** — filter inputs `min-w-[200px]` → full-width on phones.
- **`SectionsEditor.tsx`** — section-name input + button row → stack on phones.
- **`app/(app)/dashboard/page.tsx`** — `<details>` summary stat row → wrap or
  stack on phones.

## 4. Verification

Playwright sweep at **375px** and **768px** across:

- Home page (all sections).
- Contact form and thanks page.
- Portal: dashboard, projects list, wages, project log, one form page.

Check for: horizontal page scroll, overlapping or clipped content, and adequate
tap-target sizes. This catches rendering issues that static class-reading misses.

## 5. Testing strategy

The work is overwhelmingly CSS, which is not worth unit-testing. The only new
*behavior* is the `MobileNav` drawer toggle, verified through Playwright
interaction:

- Hamburger opens the drawer.
- Clicking a nav link closes it.
- `Escape` closes it.
- Backdrop click closes it.

No new vitest unit tests for layout classes.

## Files touched

New:

- `lib/portal-nav.ts`
- `components/portal/MobileNav.tsx`

Modified:

- `components/portal/TopBar.tsx`
- `components/portal/Sidebar.tsx`
- `app/(app)/layout.tsx`
- `components/sections/ContactCTA.tsx`
- `components/sections/Testimonials.tsx`
- `components/sections/Stats.tsx`
- `components/sections/Hero.tsx`
- `components/sections/Capabilities.tsx`
- `components/sections/Projects.tsx`
- `components/sections/Certifications.tsx`
- `app/(public)/contact/thanks/page.tsx`
- `app/(app)/accommodations/AccommodationForm.tsx`
- `app/(app)/wages/WagesView.tsx`
- `app/(app)/projects/[projectId]/edit/SectionsEditor.tsx`
- `app/(app)/dashboard/page.tsx`
