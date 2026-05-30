import { getService, type ServiceSlug } from "@/lib/services";
import { tradeAccent } from "@/lib/trades";

// Branded stand-in for a real project photo: a duotone trade-coloured gradient
// with a blueprint-grid texture, a large ghosted trade icon bleeding off one
// corner, a crisp icon chip + optional label, and a faint grain overlay. Reads
// as a deliberate graphic rather than a "missing image". `ratio` is a Tailwind
// aspect class; callers add rounding/borders.
export function TradeImagePlaceholder({
  trade,
  ratio = "aspect-[4/3]",
  className = "",
  label,
}: {
  trade: ServiceSlug;
  ratio?: string;
  className?: string;
  label?: string;
}) {
  const Icon = getService(trade).icon;

  return (
    <div
      style={tradeAccent(trade)}
      className={`relative ${ratio} w-full overflow-hidden bg-[var(--accent-soft)] ${className}`}
    >
      {/* Duotone diagonal wash toward the accent. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] via-[var(--accent-tint)] to-[var(--accent)]/30"
      />
      {/* Blueprint linework. */}
      <div aria-hidden className="blueprint-grid absolute inset-0 opacity-50" />
      {/* Oversized ghosted trade icon bleeding off the bottom-right. */}
      <Icon
        aria-hidden
        size={184}
        strokeWidth={1}
        className="absolute -bottom-7 -right-7 text-[var(--accent)] opacity-20"
      />
      {/* Grain for depth. */}
      <div aria-hidden className="grain absolute inset-0" />
      {/* Crisp glassy icon chip + optional label. */}
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-card)] bg-[var(--color-paper)]/85 shadow-[var(--shadow-soft)] backdrop-blur-sm">
          <Icon size={18} strokeWidth={1.75} className="text-[var(--accent)]" />
        </span>
        {label && (
          <span className="rounded-full bg-[var(--color-paper)]/85 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--accent-deep)] backdrop-blur-sm">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
