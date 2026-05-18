import { ReactNode } from "react";

export function Container({
  children,
  className = "",
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`mx-auto w-full ${
        wide ? "max-w-7xl" : "max-w-[1180px]"
      } px-6 md:px-10 ${className}`}
    >
      {children}
    </div>
  );
}
