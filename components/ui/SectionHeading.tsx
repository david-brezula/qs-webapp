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
    ? "text-[var(--color-paper)]/80"
    : "text-[var(--color-fjord)]";
  const ruleColor = invert ? "bg-[var(--color-paper)]/40" : "bg-[var(--color-fjord)]";

  return (
    <div className={`max-w-2xl ${alignCls}`}>
      {eyebrow && (
        <div
          className={`mb-5 flex items-center gap-2.5 ${
            align === "center" ? "justify-center" : ""
          }`}
        >
          <span aria-hidden className={`h-px w-7 ${ruleColor}`} />
          <span
            className={`text-[0.75rem] font-semibold uppercase tracking-[0.12em] ${eyebrowColor}`}
          >
            {eyebrow}
          </span>
        </div>
      )}
      <h2
        className={`font-display text-[2.25rem] md:text-[3.25rem] leading-[1.05] tracking-[-0.03em] ${titleColor}`}
        style={{ fontWeight: 700 }}
      >
        {title}
      </h2>
      {lede && (
        <p
          className={`mt-6 text-base md:text-[1.0625rem] leading-[1.65] ${ledeColor} max-w-xl`}
        >
          {lede}
        </p>
      )}
    </div>
  );
}
