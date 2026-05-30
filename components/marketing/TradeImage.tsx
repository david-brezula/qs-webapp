import Image from "next/image";
import type { ServiceSlug } from "@/lib/services";
import { tradeAccent } from "@/lib/trades";
import { TradeImagePlaceholder } from "./TradeImagePlaceholder";

// Renders a real photo when `src` is provided, framed with a subtle trade-tinted
// veil that ties it to the brand; otherwise falls back to the branded
// TradeImagePlaceholder. Wrap the parent in `group` to enable the hover zoom.
export function TradeImage({
  trade,
  src,
  alt = "",
  ratio = "aspect-[4/3]",
  className = "",
  label,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 33vw",
  zoom = true,
}: {
  trade: ServiceSlug;
  src?: string | null;
  alt?: string;
  ratio?: string;
  className?: string;
  label?: string;
  priority?: boolean;
  sizes?: string;
  zoom?: boolean;
}) {
  if (!src) {
    return (
      <TradeImagePlaceholder
        trade={trade}
        ratio={ratio}
        className={className}
        label={label}
      />
    );
  }

  return (
    <div
      style={tradeAccent(trade)}
      className={`relative ${ratio} w-full overflow-hidden bg-[var(--accent-soft)] ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
          zoom ? "group-hover:scale-[1.05]" : ""
        }`}
      />
      {/* Neutral veil for legibility of any overlaid text. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/35 via-[var(--color-ink)]/5 to-transparent"
      />
      {label && (
        <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-[var(--color-paper)]/90 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--color-ink)] shadow-[var(--shadow-soft)] backdrop-blur-sm">
          {label}
        </span>
      )}
    </div>
  );
}
