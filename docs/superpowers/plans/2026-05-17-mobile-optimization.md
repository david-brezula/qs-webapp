# Mobile Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public marketing site and the internal worker portal usable and polished on phone (~360–430px) and small-tablet (~768px) widths.

**Architecture:** Two kinds of change. (1) One net-new component — a hamburger-drawer navigation for the portal, since the desktop sidebar is `hidden md:flex` and mobile users currently have no navigation. The nav item list is extracted into a shared module so the desktop sidebar and the drawer never diverge. (2) Class-level responsive fixes across public sections and portal forms. This work is presentational: there is no TDD red-green cycle for CSS class strings. Verification is a Playwright visual/interaction sweep (final task) plus `npx tsc --noEmit` per task to confirm edits did not break JSX or types.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, next-intl v4, lucide-react, TypeScript. Verification via the Playwright MCP tools.

---

## File Structure

New files:

- `lib/portal-nav.ts` — single source of truth for portal nav items (`getPortalNavItems(role)`). Pure function, no React. Consumed by both `Sidebar` and `MobileNav`.
- `components/portal/MobileNav.tsx` — client component: hamburger button + slide-in drawer + backdrop. Owns its own open/close state. Rendered inside `TopBar`.

Modified files:

- `components/portal/Sidebar.tsx` — consume `getPortalNavItems`, add active-link highlight.
- `components/portal/TopBar.tsx` — accept `role`, render `<MobileNav>`, tighten layout for narrow widths.
- `app/(app)/layout.tsx` — pass `user.role` to `TopBar`.
- `components/sections/ContactCTA.tsx`, `Testimonials.tsx`, `Stats.tsx`, `Hero.tsx` — responsive typography/density.
- `app/(public)/contact/thanks/page.tsx` — responsive headline.
- `components/sections/Capabilities.tsx`, `Projects.tsx`, `Certifications.tsx` — responsive grid/density.
- `app/(app)/accommodations/AccommodationForm.tsx`, `app/(app)/wages/WagesView.tsx`, `app/(app)/projects/[projectId]/edit/SectionsEditor.tsx`, `app/(app)/dashboard/page.tsx` — responsive form layouts.

---

## Task 1: Shared portal nav items + Sidebar refactor

Extract the portal nav list so the desktop sidebar and the future mobile drawer share one definition, and add an active-link highlight.

**Files:**
- Create: `lib/portal-nav.ts`
- Modify: `components/portal/Sidebar.tsx` (full rewrite)

- [ ] **Step 1: Create the shared nav module**

Create `lib/portal-nav.ts`:

```ts
export type PortalNavItem = {
  href: string;
  labelKey: "dashboard" | "projects" | "workers" | "accommodations" | "wages";
};

/**
 * Portal navigation destinations. `labelKey` is a key in the `nav`
 * next-intl namespace — each consumer resolves it with its own `t`.
 */
export function getPortalNavItems(role: "ADMIN" | "WORKER"): PortalNavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/dashboard", labelKey: "dashboard" },
      { href: "/projects", labelKey: "projects" },
      { href: "/workers", labelKey: "workers" },
      { href: "/accommodations", labelKey: "accommodations" },
      { href: "/wages", labelKey: "wages" },
    ];
  }
  return [{ href: "/dashboard", labelKey: "dashboard" }];
}
```

- [ ] **Step 2: Rewrite `Sidebar.tsx` to use it + highlight the active route**

Replace the entire contents of `components/portal/Sidebar.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { getPortalNavItems } from "@/lib/portal-nav";

export function Sidebar({ role }: { role: "ADMIN" | "WORKER" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = getPortalNavItems(role);

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
        {items.map((i) => {
          const active =
            pathname === i.href || pathname.startsWith(i.href + "/");
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`px-3 py-2 text-sm rounded-md ${
                active
                  ? "bg-bg text-navy font-medium"
                  : "text-slate-ink hover:bg-bg hover:text-navy"
              }`}
            >
              {t(i.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/portal-nav.ts components/portal/Sidebar.tsx
git commit -m "refactor: extract shared portal nav items, add active-link highlight"
```

---

## Task 2: Mobile nav drawer + wire into TopBar & layout

Add the hamburger drawer and connect it. After this task the portal is navigable on mobile.

**Files:**
- Create: `components/portal/MobileNav.tsx`
- Modify: `components/portal/TopBar.tsx` (full rewrite)
- Modify: `app/(app)/layout.tsx:39-44`

- [ ] **Step 1: Create `MobileNav.tsx`**

Create `components/portal/MobileNav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { getPortalNavItems } from "@/lib/portal-nav";

export function MobileNav({ role }: { role: "ADMIN" | "WORKER" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = getPortalNavItems(role);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="md:hidden -ml-2 p-2 text-navy"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[var(--color-ink)]/40"
          />
          <nav className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border-soft bg-surface">
            <div className="flex items-center gap-2 border-b border-border-soft p-5">
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
            <div className="flex flex-col gap-1 p-2">
              {items.map((i) => {
                const active =
                  pathname === i.href || pathname.startsWith(i.href + "/");
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-md px-3 py-2 text-sm ${
                      active
                        ? "bg-bg text-navy font-medium"
                        : "text-slate-ink hover:bg-bg hover:text-navy"
                    }`}
                  >
                    {t(i.labelKey)}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Rewrite `TopBar.tsx` to render the drawer and survive narrow widths**

Replace the entire contents of `components/portal/TopBar.tsx` with:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { LocaleToggle } from "@/components/portal/LocaleToggle";
import { MobileNav } from "@/components/portal/MobileNav";

export function TopBar({
  name,
  email,
  language,
  role,
  signOutAction,
}: {
  name: string;
  email: string;
  language: "en" | "sk";
  role: "ADMIN" | "WORKER";
  signOutAction: () => Promise<void>;
}) {
  const t = useTranslations("nav");

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border-soft bg-surface px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav role={role} />
        <div className="min-w-0 truncate text-sm text-slate-ink">
          <span className="font-semibold text-navy">{name}</span>
          <span className="ml-2 text-xs text-muted">{email}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 md:gap-4">
        <LocaleToggle current={language} />
        <form action={signOutAction}>
          <button
            type="submit"
            className="whitespace-nowrap text-sm text-slate-ink hover:text-navy"
          >
            {t("signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Pass `role` to `TopBar` in the portal layout**

In `app/(app)/layout.tsx`, find the `<TopBar ... />` element (around line 39) and add the `role` prop:

Replace:

```tsx
          <TopBar
            name={fresh.name}
            email={user.username}
            language={(user.language?.toLowerCase() ?? "en") as "en" | "sk"}
            signOutAction={doSignOut}
          />
```

With:

```tsx
          <TopBar
            name={fresh.name}
            email={user.username}
            language={(user.language?.toLowerCase() ?? "en") as "en" | "sk"}
            role={user.role}
            signOutAction={doSignOut}
          />
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/portal/MobileNav.tsx components/portal/TopBar.tsx "app/(app)/layout.tsx"
git commit -m "feat: add mobile nav drawer for the worker portal"
```

---

## Task 3: Public site — ContactCTA, typography scale-down, Hero density

Reduce oversized mobile typography and hide a decorative SVG on phones so it cannot cause layout issues.

**Files:**
- Modify: `components/sections/ContactCTA.tsx:14,48`
- Modify: `components/sections/Testimonials.tsx:21`
- Modify: `components/sections/Stats.tsx:29`
- Modify: `components/sections/Hero.tsx:132,169`
- Modify: `app/(public)/contact/thanks/page.tsx:18`

- [ ] **Step 1: ContactCTA — hide the decorative SVG on phones**

The section already has `overflow-hidden`, so the SVG is clipped, but it is purely decorative (`aria-hidden`, `pointer-events-none`) and adds nothing on a phone. Hide it below `sm`.

In `components/sections/ContactCTA.tsx`, replace:

```tsx
        className="absolute -right-40 -bottom-40 w-[700px] h-[700px] opacity-25 pointer-events-none"
```

With:

```tsx
        className="absolute -right-40 -bottom-40 w-[700px] h-[700px] opacity-25 pointer-events-none hidden sm:block"
```

- [ ] **Step 2: ContactCTA — scale down the headline on phones**

In `components/sections/ContactCTA.tsx`, replace:

```tsx
                className="font-display text-[3rem] md:text-[5rem] lg:text-[6rem] leading-[0.96] tracking-[-0.035em]"
```

With:

```tsx
                className="font-display text-[2.25rem] sm:text-[3rem] md:text-[5rem] lg:text-[6rem] leading-[0.96] tracking-[-0.035em]"
```

- [ ] **Step 3: Testimonials — scale down the blockquote on phones**

In `components/sections/Testimonials.tsx`, replace:

```tsx
                className="font-display text-[2.5rem] md:text-[3.25rem] leading-[1.08] tracking-[-0.025em] text-[var(--color-ink)] block"
```

With:

```tsx
                className="font-display text-[1.875rem] sm:text-[2.5rem] md:text-[3.25rem] leading-[1.08] tracking-[-0.025em] text-[var(--color-ink)] block"
```

- [ ] **Step 4: Stats — scale down the numeral on phones**

In `components/sections/Stats.tsx`, replace:

```tsx
                    className="numeral text-[3.5rem] md:text-[4.5rem] leading-none tracking-[-0.04em] text-[var(--color-ink)]"
```

With:

```tsx
                    className="numeral text-[2.5rem] sm:text-[3.5rem] md:text-[4.5rem] leading-none tracking-[-0.04em] text-[var(--color-ink)]"
```

- [ ] **Step 5: Hero — scale down the headline on phones**

In `components/sections/Hero.tsx`, replace:

```tsx
              className="font-display text-[2.75rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.25rem] leading-[0.98] tracking-[-0.035em] text-[var(--color-ink)]"
```

With:

```tsx
              className="font-display text-[2.25rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.25rem] leading-[0.98] tracking-[-0.035em] text-[var(--color-ink)]"
```

- [ ] **Step 6: Hero — loosen the credential grid spacing on phones**

In `components/sections/Hero.tsx`, replace:

```tsx
            <div className="mt-14 grid grid-cols-3 gap-6 max-w-md">
```

With:

```tsx
            <div className="mt-14 grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-6 max-w-md">
```

- [ ] **Step 7: Thanks page — scale down the headline on phones**

In `app/(public)/contact/thanks/page.tsx`, replace:

```tsx
            className="font-display text-[2.5rem] md:text-[4rem] tracking-[-0.03em] text-[var(--color-ink)] leading-[1.02]"
```

With:

```tsx
            className="font-display text-[1.875rem] sm:text-[2.5rem] md:text-[4rem] tracking-[-0.03em] text-[var(--color-ink)] leading-[1.02]"
```

- [ ] **Step 8: Verify the edits did not break JSX**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add components/sections/ContactCTA.tsx components/sections/Testimonials.tsx components/sections/Stats.tsx components/sections/Hero.tsx "app/(public)/contact/thanks/page.tsx"
git commit -m "fix: scale down oversized typography on phone widths"
```

---

## Task 4: Public site — grid and density tweaks

Tighten dense card/grid layouts so they breathe on phones and tablets.

**Files:**
- Modify: `components/sections/Capabilities.tsx:55`
- Modify: `components/sections/Projects.tsx:114`
- Modify: `components/sections/Certifications.tsx:36`

- [ ] **Step 1: Capabilities — smaller icon circle on phones**

In `components/sections/Capabilities.tsx`, replace:

```tsx
                    <div className="h-11 w-11 rounded-full border border-[var(--color-ink)] flex items-center justify-center text-[var(--color-ink)] transition-colors group-hover:bg-[var(--color-ink)] group-hover:text-[var(--color-paper)]">
```

With:

```tsx
                    <div className="h-9 w-9 md:h-11 md:w-11 rounded-full border border-[var(--color-ink)] flex items-center justify-center text-[var(--color-ink)] transition-colors group-hover:bg-[var(--color-ink)] group-hover:text-[var(--color-paper)]">
```

- [ ] **Step 2: Projects — reduce card padding on phones**

In `components/sections/Projects.tsx`, replace:

```tsx
                <div className="p-7 md:p-8 flex-1 flex flex-col">
```

With:

```tsx
                <div className="p-5 md:p-8 flex-1 flex flex-col">
```

- [ ] **Step 3: Certifications — add a tablet breakpoint for the label column**

The `280px` label column is too wide at tablet widths. Add an intermediate `200px` step.

In `components/sections/Certifications.tsx`, replace:

```tsx
                className={`grid grid-cols-1 md:grid-cols-[280px_1fr_60px] gap-3 md:gap-12 py-6 md:py-7 items-baseline ${
```

With:

```tsx
                className={`grid grid-cols-1 md:grid-cols-[200px_1fr_60px] lg:grid-cols-[280px_1fr_60px] gap-3 md:gap-12 py-6 md:py-7 items-baseline ${
```

- [ ] **Step 4: Verify the edits did not break JSX**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/sections/Capabilities.tsx components/sections/Projects.tsx components/sections/Certifications.tsx
git commit -m "fix: ease grid density on phone and tablet widths"
```

---

## Task 5: Portal forms — responsive layouts

Stack two-column form rows and full-width filter controls on phones.

**Files:**
- Modify: `app/(app)/accommodations/AccommodationForm.tsx:88,92`
- Modify: `app/(app)/wages/WagesView.tsx:58-76`
- Modify: `app/(app)/projects/[projectId]/edit/SectionsEditor.tsx:57,62`
- Modify: `app/(app)/dashboard/page.tsx:115,122`

- [ ] **Step 1: AccommodationForm — stack the date and cost rows on phones**

`AccommodationForm.tsx` has two identical `<div className="grid grid-cols-2 gap-4">` wrappers (the date row and the cost/currency row). Update both with a single replace-all.

In `app/(app)/accommodations/AccommodationForm.tsx`, replace **all occurrences** of:

```tsx
      <div className="grid grid-cols-2 gap-4">
```

With:

```tsx
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

- [ ] **Step 2: WagesView — full-width filter controls on phones**

In `app/(app)/wages/WagesView.tsx`, replace the entire filter block:

```tsx
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
```

With:

```tsx
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end mb-6">
        <div className="w-full sm:w-auto">
          <label className="text-xs text-muted block mb-1">{t("from")}</label>
          <input type="date" value={f} onChange={(e) => setF(e.target.value)} className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </div>
        <div className="w-full sm:w-auto">
          <label className="text-xs text-muted block mb-1">{t("to")}</label>
          <input type="date" value={tt} onChange={(e) => setTt(e.target.value)} className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        </div>
        <div className="w-full sm:w-auto">
          <label className="text-xs text-muted block mb-1">{t("projectFilter")}</label>
          <select value={pid} onChange={(e) => setPid(e.target.value)} className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm sm:min-w-[200px]">
            <option value="">{t("all")}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Button onClick={apply} variant="primary" className="w-full sm:w-auto">{t("calculate")}</Button>
        <Button onClick={exportCsv} variant="secondary" className="w-full sm:w-auto">{t("exportCsv")}</Button>
      </div>
```

(`Button` forwards `className` — `components/Nav.tsx` already passes `className="w-full"` to it.)

- [ ] **Step 3: SectionsEditor — stack the add-section row on phones**

In `app/(app)/projects/[projectId]/edit/SectionsEditor.tsx`, replace:

```tsx
      <div className="flex gap-2 max-w-md">
        <input
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          placeholder={labels.section}
          className="flex-1 rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
        />
```

With:

```tsx
      <div className="flex flex-col sm:flex-row gap-2 max-w-md">
        <input
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          placeholder={labels.section}
          className="w-full sm:flex-1 rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
        />
```

(`flex-1` is removed from the input because in column mode it would stretch the input vertically; `w-full sm:flex-1` keeps it full-width stacked and flexible in the row.)

- [ ] **Step 4: Dashboard — wrap the project-card summary row on phones**

In `app/(app)/dashboard/page.tsx`, replace:

```tsx
            <summary className="cursor-pointer list-none flex items-center justify-between p-5 border-b border-border-soft group-open:border-border-soft">
```

With:

```tsx
            <summary className="cursor-pointer list-none flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-5 border-b border-border-soft group-open:border-border-soft">
```

Then, in the same file, replace:

```tsx
              <div className="flex items-center gap-4 text-xs text-slate-ink">
```

With:

```tsx
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-ink">
```

- [ ] **Step 5: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/accommodations/AccommodationForm.tsx" "app/(app)/wages/WagesView.tsx" "app/(app)/projects/[projectId]/edit/SectionsEditor.tsx" "app/(app)/dashboard/page.tsx"
git commit -m "fix: stack portal form rows on phone widths"
```

---

## Task 6: Verification sweep

Confirm the result on real viewport sizes and fix anything the static edits missed.

**Files:** none created; fixes (if any) applied to files from earlier tasks.

- [ ] **Step 1: Confirm the production build compiles**

Run: `npm run build`
Expected: build completes with no type errors.

- [ ] **Step 2: Start the dev server**

Run `npm run dev` in the background. Expected: ready on `http://localhost:3000`.

- [ ] **Step 3: Public site sweep at 375px**

Using the Playwright MCP tools: resize the browser to 375×800, then visit `/`, `/contact`, and `/contact/thanks`.

For each page, run `browser_evaluate` with:

```js
() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
})
```

Expected: `scrollW <= clientW + 1` (no horizontal page scroll). Take a screenshot of each page and visually confirm no overlapping or clipped content, and that headings fit.

- [ ] **Step 4: Public site sweep at 768px**

Resize to 768×1024 and repeat Step 3's navigation, evaluation, and screenshots.

- [ ] **Step 5: Portal sweep at 375px**

Resize to 375×800. Log in at `/login` using a development account (see `prisma/seed.ts` for seeded credentials). Visit `/dashboard`, `/projects`, `/wages`, a project log page (`/projects/<id>/log`), and `/accommodations/new`. Run the horizontal-scroll evaluation from Step 3 on each. Screenshot each.

- [ ] **Step 6: Verify the mobile nav drawer behavior**

On a portal page at 375px width:
1. Click the hamburger button — the drawer slides in over a dimmed backdrop.
2. Click a nav link — it navigates and the drawer closes.
3. Reopen the drawer, press `Escape` — the drawer closes.
4. Reopen the drawer, click the dimmed backdrop — the drawer closes.
5. Confirm the current page's nav link shows the active highlight (`bg-bg`, bold).

Expected: all four close paths work; the active link is highlighted.

- [ ] **Step 7: Fix and commit any issues found**

If any page reported horizontal scroll or showed clipped/overlapping content, fix it in the relevant component (smallest responsive class change that resolves it) and re-run the affected check. Then commit:

```bash
git add -A
git commit -m "fix: resolve mobile layout issues found in verification sweep"
```

If the sweep found nothing, skip the commit and note that verification passed clean.

---

## Self-Review Notes

- **Spec coverage:** Portal hamburger drawer → Tasks 1–2. Public typography/ContactCTA → Task 3. Public grid density → Task 4. Portal form fixes → Task 5. Playwright verification at 375px/768px + drawer interaction → Task 6. All spec sections map to a task.
- **ContactCTA SVG:** the spec called the decorative SVG a horizontal-overflow bug. On inspection the section has `overflow-hidden`, which already clips it — so it does not cause page scroll. Task 3 Step 1 still hides it below `sm` because it is purely decorative and this removes any ambiguity at zero functional cost. Task 6 confirms no horizontal scroll remains.
- **Type consistency:** `getPortalNavItems(role: "ADMIN" | "WORKER")` and the `PortalNavItem` shape are defined in Task 1 and consumed unchanged by `Sidebar` (Task 1) and `MobileNav` (Task 2). `TopBar`'s new `role` prop matches `user.role` passed from the layout.
- **Testing:** no unit tests — the work is CSS plus one component whose only behavior (drawer open/close) is verified by Playwright interaction in Task 6, consistent with the approved spec.
