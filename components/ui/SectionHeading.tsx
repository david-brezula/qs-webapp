import { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  invert = false,
  index,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  invert?: boolean;
  index?: string;
}) {
  const alignCls = align === "center" ? "text-center mx-auto" : "";
  const titleColor = invert ? "text-[var(--color-paper)]" : "text-[var(--color-ink)]";
  const ledeColor = invert
    ? "text-[var(--color-paper)]/75"
    : "text-[var(--color-slate)]";
  const eyebrowColor = invert
    ? "text-[var(--color-paper)]/70"
    : "text-[var(--color-slate)]";
  const ruleColor = invert
    ? "bg-[var(--color-paper)]/25"
    : "bg-[var(--color-rule)]";

  return (
    <div className={`max-w-2xl ${alignCls}`}>
      {(eyebrow || index) && (
        <div
          className={`mb-6 flex items-center gap-4 ${
            align === "center" ? "justify-center" : ""
          }`}
        >
          {index && (
            <span
              className={`numeral text-xs ${eyebrowColor} tracking-[0.15em]`}
            >
              {index}
            </span>
          )}
          {eyebrow && (
            <>
              <span className={`h-px w-8 ${ruleColor}`} aria-hidden />
              <span
                className={`eyebrow ${eyebrowColor}`}
                style={{ color: "inherit" }}
              >
                {eyebrow}
              </span>
            </>
          )}
        </div>
      )}
      <h2
        className={`font-display text-[2.25rem] md:text-[3.25rem] leading-[1.02] tracking-[-0.025em] ${titleColor}`}
        style={{ fontWeight: 350, fontVariationSettings: "'SOFT' 30, 'opsz' 144" }}
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
