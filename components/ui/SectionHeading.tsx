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
    ? "text-[var(--color-paper)]/70"
    : "text-[var(--color-slate)]";

  return (
    <div className={`max-w-2xl ${alignCls}`}>
      {eyebrow && (
        <div className={`mb-4 ${align === "center" ? "flex justify-center" : ""}`}>
          <span className={`eyebrow ${eyebrowColor}`} style={{ color: "inherit" }}>
            {eyebrow}
          </span>
        </div>
      )}
      <h2
        className={`font-display text-[2.25rem] md:text-[3.25rem] leading-[1.05] tracking-[-0.025em] ${titleColor}`}
        style={{ fontWeight: 700 }}
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
