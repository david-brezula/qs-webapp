import type { CSSProperties } from "react";
import type { ServiceSlug } from "@/lib/services";

// Per-trade accent palette as inline CSS custom properties. Apply on a wrapper
// element, e.g. `<div style={tradeAccent("solar")}>`; descendants then consume
// the colour via STATIC Tailwind classes — `text-[var(--accent)]`,
// `bg-[var(--accent-tint)]`, `from-[var(--accent-soft)]`. This indirection is
// deliberate: Tailwind scans source for literal class strings at build time, so
// a dynamic `text-[var(--trade-${slug})]` would never be generated. The static
// `--accent` alias is generated once; the wrapper swaps which trade it points at.
export function tradeAccent(trade: ServiceSlug): CSSProperties {
  return {
    "--accent": `var(--trade-${trade})`,
    "--accent-tint": `var(--trade-${trade}-tint)`,
    "--accent-soft": `var(--trade-${trade}-soft)`,
  } as CSSProperties;
}
