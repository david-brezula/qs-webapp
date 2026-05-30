import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { tradeAccent } from "@/lib/trades";
import type { ServiceSlug } from "@/lib/services";

// Rotate trade accents across the figures for colour variety.
const ACCENTS: ServiceSlug[] = ["solar", "electrical", "roofing", "masonry"];

export function StatsBand() {
  const t = useTranslations("home.stats");
  const items = t.raw("items") as { value: string; label: string }[];

  return (
    <section className="border-y border-[var(--color-rule)] bg-[var(--color-canvas)]">
      <Container className="py-14 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {items.map((item, i) => (
            <div
              key={i}
              style={tradeAccent(ACCENTS[i % ACCENTS.length])}
              className="flex flex-col gap-2"
            >
              <span className="numeral font-display text-[2.5rem] md:text-[3rem] leading-none tracking-[-0.03em] text-[var(--accent)]">
                {item.value}
              </span>
              <span className="text-[0.9375rem] leading-[1.45] text-[var(--color-slate)]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
