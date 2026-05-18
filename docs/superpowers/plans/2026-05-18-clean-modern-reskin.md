# Clean & Modern Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the warm "editorial" visual identity with a clean, modern, professional look (white/neutral palette, single blue accent, one sans-serif, flat geometric graphics) across the public site and the worker portal.

**Architecture:** Token-first. The codebase drives all color through CSS custom properties in `app/globals.css` and fonts via `next/font` variables in `app/layout.tsx`. Redefining those once recolors and re-types the entire app (including the portal, via its legacy-alias tokens). The remaining per-component work is removing editorial decoration, bumping heading font-weights (light serif weights → heavy sans weights), and redrawing four SVG illustrations as flat geometric graphics.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (`@theme`), `next/font/google`, TypeScript. Verification via `npm run build`, `npx tsc --noEmit`, and the Playwright MCP tools.

---

## File Structure

No new files. Modified:

- `app/globals.css` — design tokens (`@theme`), `body`, utility classes, remove grain texture.
- `app/layout.tsx` — font imports (drop Fraunces + JetBrains Mono).
- `components/ui/SectionHeading.tsx` — drop the `index` prop, heavy sans heading.
- `components/sections/Hero.tsx` — remove decoration, redraw hero SVG.
- `components/sections/Projects.tsx` — redraw `ProjectArt` SVG.
- `components/sections/Coverage.tsx` — redraw map SVG, remove decoration.
- `components/sections/ContactCTA.tsx` — redraw decorative SVG, heading weight.
- `components/sections/Capabilities.tsx`, `Certifications.tsx`, `Process.tsx`, `Stats.tsx`, `Testimonials.tsx` — remove decoration, heading weights.
- `components/Nav.tsx`, `components/Footer.tsx` — logo weight.
- `app/(app)/projects/[projectId]/log/TableLogger.tsx` — replace one hardcoded legacy color.

This work is presentational: there is no TDD red-green cycle. Per-task verification is `npx tsc --noEmit`; the final task is a `npm run build` + Playwright visual sweep.

---

## Task 1: Design tokens & fonts

Recolor and re-type the whole app at the source.

**Files:**
- Modify: `app/globals.css` (full rewrite)
- Modify: `app/layout.tsx` (full rewrite)

- [ ] **Step 1: Rewrite `app/globals.css`**

Replace the entire contents of `app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  /* Clean modern palette — white surfaces, neutral grays, single blue accent */
  --color-paper: #FFFFFF;
  --color-paper-2: #F1F3F5;
  --color-canvas: #F7F8FA;
  --color-ink: #0F172A;
  --color-ink-2: #1E293B;
  --color-slate: #475569;
  --color-mist: #94A3B8;
  --color-rule: #E2E8F0;
  --color-rule-soft: #EEF1F4;
  --color-fjord: #2563EB;
  --color-fjord-2: #1D4ED8;
  --color-ember: #2563EB;
  --color-ember-2: #1D4ED8;
  --color-moss: #2563EB;

  /* Legacy aliases (used by internal /app/* and /portal/* pages) */
  --color-bg: #FFFFFF;
  --color-surface: #F7F8FA;
  --color-navy: #0F172A;
  --color-navy-700: #1E293B;
  --color-slate-ink: #475569;
  --color-border-soft: #E2E8F0;
  --color-accent: #2563EB;
  --color-accent-ink: #FFFFFF;
  --color-muted: #94A3B8;

  --font-sans: var(--font-body), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-body), ui-sans-serif, system-ui, sans-serif;
  --font-mono-sans: var(--font-body), ui-sans-serif, system-ui, sans-serif;

  --radius-card: 8px;
  --radius-pill: 999px;
}

html, body {
  background-color: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

::selection {
  background-color: var(--color-ink);
  color: var(--color-paper);
}

html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}

.font-display {
  font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
}
.font-mono {
  font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
}

.eyebrow {
  font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-slate);
}

.rule-hair { background: var(--color-rule); height: 1px; width: 100%; }

.numeral {
  font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
  font-feature-settings: "tnum";
}

.lift {
  transition: transform 0.4s cubic-bezier(0.2, 0.7, 0.2, 1),
              border-color 0.3s ease,
              box-shadow 0.4s ease;
}
.lift:hover { transform: translateY(-2px); }
```

Key changes: all color values are the new clean palette; both accent tokens (`ember`, `fjord`) and `moss` collapse to blue `#2563EB`; the `body` paper-grain `background-image` is removed; `.font-display`, `.font-mono`, `.eyebrow`, `.numeral` now resolve to the sans `--font-body`; `.eyebrow` loses its monospace look; `--radius-card` is `8px`.

- [ ] **Step 2: Rewrite `app/layout.tsx`**

Replace the entire contents of `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Quantum Sphere — Solar EPC subcontracting across Europe",
  description:
    "Solar construction subcontractor based in Slovakia. Crews for utility, commercial and rooftop installations across DACH and Scandinavia.",
  metadataBase: new URL("https://quantumsphere.eu"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
```

This drops the `Fraunces` and `JetBrains_Mono` imports; Plus Jakarta Sans is the only font and supplies `--font-body`.

- [ ] **Step 3: Verify the build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: build completes, no errors. (Run the full build here because this task changes foundational files.)

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: clean-modern design tokens and single sans-serif font"
```

---

## Task 2: SectionHeading — drop the `§` index, heavy sans heading

**Files:**
- Modify: `components/ui/SectionHeading.tsx` (full rewrite)

- [ ] **Step 1: Rewrite `components/ui/SectionHeading.tsx`**

Replace the entire contents with:

```tsx
import { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  invert = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  invert?: boolean;
}) {
  const alignCls = align === "center" ? "text-center mx-auto" : "";
  const titleColor = invert ? "text-[var(--color-paper)]" : "text-[var(--color-ink)]";
  const ledeColor = invert
    ? "text-[var(--color-paper)]/75"
    : "text-[var(--color-slate)]";
  const eyebrowColor = invert
    ? "text-[var(--color-paper)]/70"
    : "text-[var(--color-slate)]";

  return (
    <div className={`max-w-2xl ${alignCls}`}>
      {eyebrow && (
        <div className={`mb-4 ${align === "center" ? "flex justify-center" : ""}`}>
          <span className={`eyebrow ${eyebrowColor}`} style={{ color: "inherit" }}>
            {eyebrow}
          </span>
        </div>
      )}
      <h2
        className={`font-display text-[2.25rem] md:text-[3.25rem] leading-[1.05] tracking-[-0.025em] ${titleColor}`}
        style={{ fontWeight: 700 }}
      >
        {title}
      </h2>
      {lede && (
        <p className={`mt-6 text-base md:text-[1.0625rem] leading-[1.65] ${ledeColor} max-w-xl`}>
          {lede}
        </p>
      )}
    </div>
  );
}
```

This removes the `index` prop entirely, removes the decorative `h-px w-8` rule beside the eyebrow, and changes the heading from light serif (`fontWeight: 350` + Fraunces `fontVariationSettings`) to heavy sans (`fontWeight: 700`).

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: errors in `Capabilities.tsx`, `Process.tsx`, `Projects.tsx`, `Certifications.tsx`, `Coverage.tsx` — they still pass the now-removed `index` prop. This is expected; those call sites are fixed in Tasks 3-7. Confirm the ONLY errors are about the `index` prop on `SectionHeading`.

- [ ] **Step 3: Commit**

```bash
git add components/ui/SectionHeading.tsx
git commit -m "feat: remove section-number index from SectionHeading"
```

---

## Task 3: Hero — remove decoration, redraw the hero visual

**Files:**
- Modify: `components/sections/Hero.tsx` (full rewrite)

- [ ] **Step 1: Rewrite `components/sections/Hero.tsx`**

Replace the entire contents with:

```tsx
import { HERO } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/sections/Reveal";
import { ArrowRight, ArrowDownRight } from "lucide-react";

function HeroVisual() {
  return (
    <svg viewBox="0 0 520 560" className="w-full h-auto" aria-hidden>
      <rect width="520" height="560" rx="16" fill="#F1F3F5" />
      <circle cx="372" cy="150" r="66" fill="#2563EB" />
      {[0, 1, 2].map((row) => (
        <g key={row} opacity={0.4 + row * 0.3}>
          {[0, 1, 2].map((col) => (
            <rect
              key={col}
              x={48 + col * 148}
              y={300 + row * 80}
              width="124"
              height="56"
              rx="8"
              fill="#2563EB"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative pt-10 md:pt-16 pb-24 md:pb-36 overflow-hidden">
      <Container className="relative">
        <div className="grid gap-14 md:gap-20 md:grid-cols-[1.15fr_1fr] md:items-end">
          <Reveal>
            <span className="eyebrow text-[var(--color-slate)]">{HERO.eyebrow}</span>
            <h1
              className="mt-6 font-display text-[2.25rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.25rem] leading-[1.02] tracking-[-0.035em] text-[var(--color-ink)]"
              style={{ fontWeight: 700 }}
            >
              {HERO.headline.split("—")[0]}
              <span className="block">
                <span className="text-[var(--color-ember)]">
                  {HERO.headline.split("—")[1]}
                </span>
              </span>
            </h1>

            <p className="mt-9 max-w-xl text-[1.0625rem] md:text-[1.125rem] leading-[1.6] text-[var(--color-slate)]">
              {HERO.sub}
            </p>

            <div className="mt-10 flex flex-wrap gap-3 items-center">
              <Button href={HERO.primaryCta.href} variant="primary">
                {HERO.primaryCta.label}
                <ArrowRight size={15} strokeWidth={1.5} />
              </Button>
              <a
                href={HERO.secondaryCta.href}
                className="group inline-flex items-center gap-2 text-[0.875rem] text-[var(--color-ink)] hover:text-[var(--color-fjord)] transition-colors px-3 py-2"
              >
                {HERO.secondaryCta.label}
                <ArrowDownRight
                  size={14}
                  strokeWidth={1.5}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5"
                />
              </a>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-6 max-w-md">
              {[
                { k: "ISO 9001 · 14001 · 45001", v: "Quality, environment, safety" },
                { k: "DGUV qualified", v: "On every site" },
                { k: "VDE · OVE · SIA", v: "Compliant crews" },
              ].map((item) => (
                <div key={item.k}>
                  <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink)]">
                    {item.k}
                  </div>
                  <div className="text-[0.6875rem] text-[var(--color-mist)] mt-1 leading-snug">
                    {item.v}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <HeroVisual />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
```

This removes the decorative 12-column hairline grid background, the "Vol. 07 · DACH + Nordics edition" metadata strip, and the "Plate · sun disc / fig. 01" caption; replaces the hand-drawn `NorthernArt` SVG with the flat `HeroVisual`; sets the `h1` to heavy sans (`fontWeight: 700`, no Fraunces axes); and drops the `italic` serif treatment on the accent span (keeping its blue color). The credential row's monospace labels become plain semibold uppercase.

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no NEW errors in `Hero.tsx` (the Task 2 `index`-prop errors in other files may still appear — that is expected until their tasks run).

- [ ] **Step 3: Commit**

```bash
git add components/sections/Hero.tsx
git commit -m "feat: clean-modern Hero — flat visual, no editorial decoration"
```

---

## Task 4: Projects — redraw the project-card art

**Files:**
- Modify: `components/sections/Projects.tsx`

- [ ] **Step 1: Replace the `ProjectArt` function**

In `components/sections/Projects.tsx`, replace the entire `ProjectArt` function (it begins with `function ProjectArt({ seed, scope }: { seed: number; scope: string }) {` and ends at its closing `}` before `export function Projects()`) with:

```tsx
function ProjectArt({ seed }: { seed: number }) {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-40 md:h-44" aria-hidden>
      <rect width="400" height="220" fill="#0F172A" />
      {Array.from({ length: 4 }).map((_, r) => (
        <g key={r}>
          {Array.from({ length: 6 }).map((_, c) => (
            <rect
              key={c}
              x={34 + c * 58}
              y={42 + r * 36}
              width="48"
              height="26"
              rx="4"
              fill="#2563EB"
              fillOpacity={0.3 + ((r + c + seed) % 3) * 0.32}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Update the `ProjectArt` call site**

In the same file, find:

```tsx
                <ProjectArt seed={i + 1} scope={p.scope} />
```

Replace with:

```tsx
                <ProjectArt seed={i + 1} />
```

- [ ] **Step 3: Remove the `index` prop from the SectionHeading call**

In the same file, find and delete this line (inside the `<SectionHeading ... />`):

```tsx
            index="§ 03"
```

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors in `Projects.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/sections/Projects.tsx
git commit -m "feat: flat geometric project-card art"
```

---

## Task 5: Coverage — redraw the map, remove decoration

**Files:**
- Modify: `components/sections/Coverage.tsx`

- [ ] **Step 1: Remove the `index` prop from the SectionHeading call**

In `components/sections/Coverage.tsx`, find and delete this line:

```tsx
            index="§ 05"
```

- [ ] **Step 2: De-serif the accent word in the heading title**

Find:

```tsx
                <span
                  className="italic"
                  style={{ fontVariationSettings: "'SOFT' 100, 'opsz' 144" }}
                >
                  {" "}
                  sun{" "}
                </span>
```

Replace with:

```tsx
                <span className="text-[var(--color-fjord)]">
                  {" "}
                  sun{" "}
                </span>
```

- [ ] **Step 3: Replace the map SVG**

In the same file, replace the entire `<svg ...>...</svg>` element (it starts with `<svg viewBox="-220 -340 440 440"` and ends at the matching `</svg>`) with:

```tsx
              <svg viewBox="-220 -340 440 440" className="w-full h-full">
                <rect x="-220" y="-340" width="440" height="440" fill="#F7F8FA" />
                {COVERAGE_COUNTRIES.filter((c) => c.code !== "SK").map((c) => {
                  const co = COORDS[c.code];
                  if (!co) return null;
                  return (
                    <line
                      key={`l-${c.code}`}
                      x1="0"
                      y1="0"
                      x2={co.dx}
                      y2={co.dy}
                      stroke="#94A3B8"
                      strokeWidth="1"
                    />
                  );
                })}
                {COVERAGE_COUNTRIES.map((c) => {
                  const co = COORDS[c.code];
                  if (!co) return null;
                  const isHQ = c.code === "SK";
                  return (
                    <circle
                      key={c.code}
                      cx={co.dx}
                      cy={co.dy}
                      r={isHQ ? 11 : 5.5}
                      fill={isHQ ? "#2563EB" : "#0F172A"}
                    />
                  );
                })}
              </svg>
```

This drops the radial gradient, concentric dashed rings, crosshair, and all in-SVG monospace text/coordinates — the country list beside the map already labels every marker.

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors in `Coverage.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/sections/Coverage.tsx
git commit -m "feat: flat coverage map, no editorial labels"
```

---

## Task 6: ContactCTA — redraw the decorative SVG, heading weight

**Files:**
- Modify: `components/sections/ContactCTA.tsx`

- [ ] **Step 1: Replace the decorative SVG**

In `components/sections/ContactCTA.tsx`, replace the entire `<svg ...>...</svg>` element (it starts with `<svg` followed by `aria-hidden` and `viewBox="0 0 800 600"`, and ends at the matching `</svg>`) with:

```tsx
      <svg
        aria-hidden
        viewBox="0 0 320 320"
        className="absolute -right-10 -bottom-10 w-80 h-80 pointer-events-none hidden sm:block"
      >
        {[0, 1, 2, 3].map((r) => (
          <g key={r}>
            {[0, 1, 2, 3].map((c) => (
              <rect
                key={c}
                x={c * 76}
                y={r * 76}
                width="60"
                height="60"
                rx="8"
                fill="#FFFFFF"
                fillOpacity={0.04 + ((r + c) % 3) * 0.03}
              />
            ))}
          </g>
        ))}
      </svg>
```

This replaces the concentric-arc graphic (and its `radialGradient` `<defs>`) with a flat, subtle panel-grid accent that reads cleanly on the dark CTA background.

- [ ] **Step 2: Set the heading to heavy sans**

In the same file, find:

```tsx
                className="font-display text-[2.25rem] sm:text-[3rem] md:text-[5rem] lg:text-[6rem] leading-[0.96] tracking-[-0.035em]"
                style={{ fontWeight: 320 }}
```

Replace with:

```tsx
                className="font-display text-[2.25rem] sm:text-[3rem] md:text-[5rem] lg:text-[6rem] leading-[0.98] tracking-[-0.035em]"
                style={{ fontWeight: 700 }}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors in `ContactCTA.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/sections/ContactCTA.tsx
git commit -m "feat: flat ContactCTA accent, heavy sans heading"
```

---

## Task 7: Remaining sections, Nav & Footer — decoration & weights

Mechanical edits across the components that only need decoration removal and heading-weight bumps.

**Files:**
- Modify: `components/sections/Capabilities.tsx`, `Certifications.tsx`, `Process.tsx`, `Stats.tsx`, `Testimonials.tsx`, `components/Nav.tsx`, `components/Footer.tsx`

- [ ] **Step 1: Capabilities.tsx**

Delete this line:

```tsx
            index="§ 01"
```

Replace:

```tsx
                <span
                  className="italic text-[var(--color-fjord)] block"
                  style={{ fontVariationSettings: "'SOFT' 100, 'opsz' 144" }}
                >
```

with:

```tsx
                <span className="text-[var(--color-fjord)] block">
```

Replace (the `<h3>` style):

```tsx
                    style={{ fontWeight: 400 }}
```

with:

```tsx
                    style={{ fontWeight: 600 }}
```

- [ ] **Step 2: Certifications.tsx**

Delete this line:

```tsx
            index="§ 04"
```

Replace:

```tsx
                <span
                  className="italic block text-[var(--color-fjord)]"
                  style={{ fontVariationSettings: "'SOFT' 100, 'opsz' 144" }}
                >
```

with:

```tsx
                <span className="block text-[var(--color-fjord)]">
```

- [ ] **Step 3: Process.tsx**

Delete this line:

```tsx
            index="§ 02"
```

Replace:

```tsx
                <span
                  className="italic"
                  style={{ fontVariationSettings: "'SOFT' 100, 'opsz' 144" }}
                >
                  actually
                </span>
```

with:

```tsx
                <span className="text-[var(--color-fjord)]">actually</span>
```

Replace (the `<h3>` style):

```tsx
                  style={{ fontWeight: 400 }}
```

with:

```tsx
                  style={{ fontWeight: 600 }}
```

- [ ] **Step 4: Stats.tsx**

Replace:

```tsx
            <span className="eyebrow text-[var(--color-ink)]">Specimen · operating record</span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--color-mist)]">
              YoY through Q1 2026
            </span>
```

with:

```tsx
            <span className="eyebrow text-[var(--color-ink)]">Operating record</span>
            <span className="text-[0.8125rem] text-[var(--color-mist)]">
              Year on year, through Q1 2026
            </span>
```

Replace (the numeral `<span>` style):

```tsx
                    style={{ fontWeight: 500 }}
```

with:

```tsx
                    style={{ fontWeight: 600 }}
```

- [ ] **Step 5: Testimonials.tsx**

Replace (the blockquote `<span>` style):

```tsx
                style={{ fontWeight: 350 }}
```

with:

```tsx
                style={{ fontWeight: 600 }}
```

Then remove the Fraunces axes from both quote-mark spans — replace **both** occurrences of:

```tsx
                  style={{ fontVariationSettings: "'SOFT' 100, 'opsz' 144" }}
```

by deleting that attribute line entirely (the surrounding `<span className="text-[var(--color-ember)] ...">` keeps its blue color). Use the editor's replace-all for this exact line within this file.

- [ ] **Step 6: Nav.tsx**

Replace:

```tsx
        <span className="font-display text-[1rem] tracking-[-0.01em] text-[var(--color-ink)]" style={{ fontWeight: 450 }}>
```

with:

```tsx
        <span className="font-display text-[1rem] tracking-[-0.01em] text-[var(--color-ink)]" style={{ fontWeight: 600 }}>
```

- [ ] **Step 7: Footer.tsx**

Replace:

```tsx
              <span
                className="font-display text-[1.05rem] tracking-[-0.01em] text-[var(--color-ink)]"
                style={{ fontWeight: 450 }}
              >
```

with:

```tsx
              <span
                className="font-display text-[1.05rem] tracking-[-0.01em] text-[var(--color-ink)]"
                style={{ fontWeight: 600 }}
              >
```

- [ ] **Step 8: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors anywhere (all `index`-prop call sites are now fixed).

- [ ] **Step 9: Commit**

```bash
git add components/sections/Capabilities.tsx components/sections/Certifications.tsx components/sections/Process.tsx components/sections/Stats.tsx components/sections/Testimonials.tsx components/Nav.tsx components/Footer.tsx
git commit -m "feat: clean-modern decoration & heading weights across sections"
```

---

## Task 8: Portal pass

The portal repaints automatically via the legacy-alias tokens (Task 1). This task confirms nothing relied on the old palette and fixes hardcoded legacy colors.

**Files:**
- Modify: `app/(app)/projects/[projectId]/log/TableLogger.tsx`

- [ ] **Step 1: Find hardcoded colors in the portal**

Run a search for hardcoded hex colors in the portal directories:

Use Grep with pattern `#[0-9A-Fa-f]{6}` over `app/(app)/` and `components/portal/`.
Expected: one match — `TableLogger.tsx`, a `hover:bg-[#FFC526]` (a leftover yellow from the pre-redesign portal).

- [ ] **Step 2: Replace the hardcoded yellow hover**

In `app/(app)/projects/[projectId]/log/TableLogger.tsx`, find:

```tsx
          className="px-2.5 py-1 rounded-md bg-accent text-navy text-xs font-semibold hover:bg-[#FFC526] disabled:opacity-50"
```

Replace with:

```tsx
          className="px-2.5 py-1 rounded-md bg-accent text-accent-ink text-xs font-semibold hover:bg-[var(--color-fjord-2)] disabled:opacity-50"
```

This makes the button use the blue accent with a darker-blue hover, and white (`accent-ink`) text instead of dark `navy` text (which is now low-contrast on blue).

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/projects/[projectId]/log/TableLogger.tsx"
git commit -m "fix: replace legacy yellow portal accent with blue"
```

---

## Task 9: Verification sweep

**Files:** none created; fixes (if any) applied to files from earlier tasks.

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build completes, no type errors.

- [ ] **Step 2: Existing tests still pass**

Run: `npm test`
Expected: 25 passed.

- [ ] **Step 3: Start the dev server**

Run `npm run dev` (background) — or use an already-running dev server on `localhost:3000`/`3001`.

- [ ] **Step 4: Public visual sweep**

Using the Playwright MCP tools, at viewport 1280×900 and again at 375×800, visit `/`, `/contact`, `/contact/thanks`. Screenshot each. Confirm: white/neutral palette throughout, one blue accent, sans-serif headings, no leftover beige/terracotta, no serif text, the flat hero/coverage/project graphics render, no editorial "Vol. 07 / § / Plate / fig." labels remain, and no horizontal overflow (`document.documentElement.scrollWidth <= clientWidth + 1`).

- [ ] **Step 5: Portal visual sweep**

At 1280×900 and 375×800, log in and visit `/dashboard`, `/projects`, `/wages`, a project log page. Confirm the portal repainted to the new palette, headings/buttons look consistent, and there is no leftover warm color.

- [ ] **Step 6: Fix and commit any issues found**

If the sweep finds leftover old-palette color, broken contrast, or layout breakage, fix it in the relevant component (smallest change) and commit:

```bash
git add -A
git commit -m "fix: resolve issues found in reskin verification sweep"
```

If the sweep is clean, note that verification passed and skip the commit.

---

## Self-Review Notes

- **Spec coverage:** Palette → Task 1. Typography → Task 1. Decoration removal → Tasks 2 (`§` index), 3 (Hero strip/grid/caption), 5 (Coverage labels), 7 (italics, Stats tags). Flat graphics → Tasks 3 (hero), 4 (projects), 5 (coverage), 6 (ContactCTA). Portal → Tasks 1 (tokens cascade) + 8 (hardcoded color). Verification → Task 9. All spec sections map to tasks.
- **Logo SVG:** the spec said the logo is "kept with minor cleanup." It is already simple flat geometry (a circle + crosshair) and recolors automatically via `currentColor`/tokens — no edit needed; not a gap.
- **Type consistency:** `SectionHeading` drops `index` (Task 2); every call site that passed `index` is fixed (Tasks 3-7). `ProjectArt` drops the `scope` param (Task 4) and its only call site is updated in the same task.
- **Phasing:** Task 1 leaves the app fully working (recolored/re-typed; remaining tasks only remove decoration). Task 2 intentionally leaves transient `tsc` errors in five files that Tasks 3-7 resolve — Step 2 of Task 2 calls this out explicitly.
