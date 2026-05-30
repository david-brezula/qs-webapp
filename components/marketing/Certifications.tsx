import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/motion";
import type { ServiceSlug } from "@/lib/services";
import { tradeAccent } from "@/lib/trades";

export function Certifications({ slug }: { slug: ServiceSlug }) {
  const t = useTranslations(`services.${slug}.certifications`);
  const items = (t.raw("items") as string[]) ?? [];

  if (items.length === 0) return null;

  return (
    <section
      style={tradeAccent(slug)}
      className="border-y border-[var(--color-rule)] bg-[var(--color-canvas)]"
    >
      <Container className="py-16 md:py-24">
        <Reveal>
          <h2
            className="mb-10 font-display text-[1.75rem] tracking-[-0.02em] text-[var(--color-ink)] md:text-[2.25rem]"
            style={{ fontWeight: 700 }}
          >
            {t("title")}
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="flex flex-wrap gap-3">
            {items.map((item, i) => (
              <span
                key={i}
                className="lift inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-2 text-[0.875rem] text-[var(--color-slate)] shadow-[var(--shadow-soft)] hover:border-[var(--accent)]/50 hover:text-[var(--color-ink)]"
              >
                <ShieldCheck
                  size={14}
                  strokeWidth={1.75}
                  className="text-[var(--accent)]"
                />
                {item}
              </span>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
