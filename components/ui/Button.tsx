import Link from "next/link";
import { ReactNode } from "react";

export type Variant = "primary" | "secondary" | "ghost" | "ember" | "accent";

const STYLES: Record<Variant, string> = {
  primary:
    "bg-[var(--color-ink)] text-[var(--color-paper)] border border-[var(--color-ink)] shadow-[var(--shadow-soft)] hover:bg-[var(--color-fjord)] hover:border-[var(--color-fjord)] hover:shadow-[var(--shadow-card)] focus-visible:ring-[var(--color-ink)]",
  secondary:
    "bg-[var(--color-paper)]/60 text-[var(--color-ink)] border border-[var(--color-ink)]/20 backdrop-blur-sm hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] focus-visible:ring-[var(--color-ink)]",
  ghost:
    "bg-transparent text-[var(--color-paper)] border border-[var(--color-paper)]/40 hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] focus-visible:ring-[var(--color-paper)]",
  ember:
    "bg-[var(--color-ember)] text-[var(--color-paper)] border border-[var(--color-ember)] shadow-[var(--shadow-soft)] hover:bg-[var(--color-ember-2)] hover:border-[var(--color-ember-2)] hover:shadow-[var(--shadow-card)] focus-visible:ring-[var(--color-ember)]",
  accent:
    "bg-[var(--accent)] text-[var(--color-paper)] border border-[var(--accent)] shadow-[var(--shadow-soft)] hover:bg-[var(--accent-deep)] hover:border-[var(--accent-deep)] hover:shadow-[var(--shadow-card)] focus-visible:ring-[var(--accent)]",
};

const BASE =
  "group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-[0.8125rem] font-medium tracking-wide rounded-[var(--radius-pill)] transition-all duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:shadow-none";

// Shared so locale-aware marketing CTAs (next-intl Link) can match Button styling.
export function buttonClass(variant: Variant = "primary", className = "") {
  return `${BASE} ${STYLES[variant]} ${className}`;
}

export function Button({
  href,
  variant = "primary",
  children,
  type = "button",
  disabled,
  onClick,
  className = "",
}: {
  href?: string;
  variant?: Variant;
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const cls = `${BASE} ${STYLES[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
