import { getService, type ServiceSlug } from "@/lib/services";
import { tradeAccent } from "@/lib/trades";

// Branded stand-in for a real project photo: a trade-coloured gradient with a
// blueprint-grid texture and the trade icon centred. Drops out cleanly for a
// real <Image> later. `ratio` is a Tailwind aspect class; callers add rounding.
export function TradeImagePlaceholder({
  trade,
  ratio = "aspect-[4/3]",
  className = "",
}: {
  trade: ServiceSlug;
  ratio?: string;
  className?: string;
}) {
  const Icon = getService(trade).icon;

  return (
    <div
      style={tradeAccent(trade)}
      className={`relative ${ratio} w-full overflow-hidden bg-gradient-to-br from-[var(--accent-soft)] to-[var(--accent-tint)] ${className}`}
    >
      <div aria-hidden className="blueprint-grid absolute inset-0 opacity-50" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/[0.04] to-transparent"
      />
      <div className="absolute inset-0 grid place-items-center">
        <Icon size={52} strokeWidth={1.25} className="text-[var(--accent)] opacity-85" />
      </div>
    </div>
  );
}
