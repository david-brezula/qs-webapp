import Link from "next/link";
import { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "ember";

const STYLES: Record<Variant, string> = {
  primary:
    "bg-[var(--color-ink)] text-[var(--color-paper)] border border-[var(--color-ink)] hover:bg-[var(--color-fjord)] hover:border-[var(--color-fjord)] focus-visible:ring-[var(--color-ink)]",
  secondary:
    "bg-transparent text-[var(--color-ink)] border border-[var(--color-ink)]/30 hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] focus-visible:ring-[var(--color-ink)]",
  ghost:
    "bg-transparent text-[var(--color-paper)] border border-[var(--color-paper)]/40 hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] focus-visible:ring-[var(--color-paper)]",
  ember:
    "bg-[var(--color-ember)] text-[var(--color-paper)] border border-[var(--color-ember)] hover:bg-[var(--color-ember-2)] hover:border-[var(--color-ember-2)] focus-visible:ring-[var(--color-ember)]",
};

const BASE =
  "group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-[0.8125rem] font-medium tracking-wide rounded-[var(--radius-pill)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)] disabled:cursor-not-allowed disabled:opacity-60";

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
