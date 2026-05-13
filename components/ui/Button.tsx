import Link from "next/link";
import { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const STYLES: Record<Variant, string> = {
  primary:
    "bg-accent text-navy hover:bg-[#FFC526] focus-visible:ring-accent",
  secondary:
    "bg-transparent text-navy border border-navy hover:bg-navy hover:text-bg focus-visible:ring-navy",
  ghost:
    "bg-transparent text-bg border border-bg/40 hover:bg-bg hover:text-navy focus-visible:ring-bg",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-60";

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
