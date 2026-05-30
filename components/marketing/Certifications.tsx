import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import type { ServiceSlug } from "@/lib/services";
import { tradeAccent } from "@/lib/trades";

export function Certifications({ slug }: { slug: ServiceSlug }) {
  const t = useTranslations(`services.${slug}.certifications`);
  const items = (t.raw("items") as string[]) ?? [];

  if (items.length === 0) return null;

  return (
    <section
      style={tradeAccent(slug)}
      className="bg-[var(--color-canvas)] border-y border-[var(--color-rule)]"
    >
      <Container className="py-16 md:py-24">
        <h2
          className="font-display text-[1.75rem] md:text-[2.25rem] tracking-[-0.02em] text-[var(--color-ink)] mb-10"
          style={{ fontWeight: 700 }}
        >
          {t("title")}
        </h2>
        <div className="flex flex-wrap gap-3">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-2 text-[0.875rem] text-[var(--color-slate)]"
            >
              <ShieldCheck size={14} strokeWidth={1.5} className="text-[var(--accent)]" />
              {item}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
