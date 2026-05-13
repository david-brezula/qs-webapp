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
  const titleColor = invert ? "text-bg" : "text-navy";
  const ledeColor = invert ? "text-bg/80" : "text-slate-ink";
  const eyebrowColor = invert ? "text-accent" : "text-navy/60";
  return (
    <div className={`max-w-2xl ${alignCls}`}>
      {eyebrow && (
        <div
          className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${eyebrowColor}`}
        >
          {eyebrow}
        </div>
      )}
      <h2
        className={`text-3xl md:text-4xl font-semibold leading-tight tracking-tight ${titleColor}`}
      >
        {title}
      </h2>
      {lede && (
        <p className={`mt-4 text-base md:text-lg leading-relaxed ${ledeColor}`}>
          {lede}
        </p>
      )}
    </div>
  );
}
