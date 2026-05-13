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
      className={`rounded-[var(--radius-card)] border border-border-soft bg-surface p-6 transition-colors hover:border-navy/30 ${className}`}
    >
      {children}
    </div>
  );
}
