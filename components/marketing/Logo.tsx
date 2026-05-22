import { Link } from "@/lib/i18n/navigation";

// Quantum Sphere wordmark + circular crosshair mark (shared brand mark,
// carried over from the original site for visual continuity).
export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <Link
      href="/"
      className="group flex items-center gap-3"
      aria-label="Quantum Sphere — home"
    >
      <svg
        viewBox="0 0 32 32"
        width="28"
        height="28"
        className="text-[var(--color-ink)]"
        aria-hidden
      >
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="16" cy="16" r="5" fill="currentColor" />
        <line x1="16" y1="2" x2="16" y2="30" stroke="currentColor" strokeWidth="0.6" />
        <line x1="2" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="0.6" />
      </svg>
      <span className="flex flex-col leading-none">
        <span
          className="font-display text-[1rem] tracking-[-0.01em] text-[var(--color-ink)]"
          style={{ fontWeight: 600 }}
        >
          Quantum Sphere
        </span>
        {subtitle && (
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-[var(--color-mist)] mt-0.5">
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
