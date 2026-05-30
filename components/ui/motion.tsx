"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  animate,
  type Variants,
} from "framer-motion";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/**
 * Scroll-reveal: fades + rises its children into view once. Collapses to a
 * plain wrapper when the user prefers reduced motion. Safe to wrap
 * server-rendered children — only this wrapper is a client component.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 18,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "section" | "li" | "span";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** Staggered container — children wrapped in <StaggerItem> reveal in sequence. */
export function Stagger({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/**
 * Animated number. Parses an optional non-numeric prefix/suffix (e.g. "120+",
 * "98%", "1,200 m²") and counts the numeric part up from zero when scrolled
 * into view. Preserves the source's decimal places and thousands grouping.
 */
export function CountUp({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();

  const match = value.match(/^(\D*)([\d.,]+)(.*)$/);
  const prefix = match?.[1] ?? "";
  const numStr = match?.[2] ?? "";
  const suffix = match?.[3] ?? "";

  const hasGrouping = numStr.includes(",");
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  const target = numStr ? parseFloat(numStr.replace(/,/g, "")) : NaN;

  const format = (n: number) => {
    const fixed = n.toFixed(decimals);
    if (!hasGrouping) return fixed;
    return Number(fixed).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const [display, setDisplay] = useState(() =>
    Number.isNaN(target) ? numStr : format(0),
  );

  useEffect(() => {
    if (Number.isNaN(target)) return;
    if (!inView) return;
    // Reduced motion → duration 0 jumps straight to the target via the
    // onUpdate callback (so we never call setState synchronously in the effect).
    const controls = animate(0, target, {
      duration: reduce ? 0 : 1.4,
      ease: EASE,
      onUpdate: (v) => setDisplay(format(v)),
      onComplete: () => setDisplay(format(target)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, target, reduce]);

  if (Number.isNaN(target)) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
