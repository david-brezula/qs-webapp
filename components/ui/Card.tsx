import { ReactNode } from "react";

type CardTone = "default" | "success";

const TONE_CLASSES: Record<CardTone, string> = {
  default:
    "bg-[var(--color-canvas)] border-[var(--color-rule)] hover:border-[var(--color-ink)]/40",
  success: "bg-emerald-50 border-emerald-500 hover:border-emerald-600",
};

export function Card({
  children,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
}) {
  return (
    <div
      className={`lift relative border rounded-[var(--radius-card)] p-7 ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
