import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`lift relative bg-[var(--color-canvas)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-7 hover:border-[var(--color-ink)]/40 ${className}`}
    >
      {children}
    </div>
  );
}
