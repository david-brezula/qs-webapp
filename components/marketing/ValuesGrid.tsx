import { useTranslations } from "next-intl";
import { Users, ShieldCheck, Clock, Wrench, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { tradeAccent } from "@/lib/trades";
import type { ServiceSlug } from "@/lib/services";

const ICONS: LucideIcon[] = [Users, ShieldCheck, Clock, Wrench];
// Rotate trade accents so the four value cards each carry a distinct colour.
const ACCENTS: ServiceSlug[] = ["electrical", "roofing", "solar", "masonry"];

export function ValuesGrid() {
  const t = useTranslations("home.values");
  const items = t.raw("items") as { title: string; body: string }[];

  return (
    <section>
      <Container className="py-20 md:py-28">
        <SectionHeading title={t("title")} lede={t("subtitle")} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <Card key={i} style={tradeAccent(ACCENTS[i % ACCENTS.length])}>
                <span className="grid place-items-center h-12 w-12 rounded-[var(--radius-card)] bg-[var(--accent-tint)]">
                  <Icon size={24} strokeWidth={1.5} className="text-[var(--accent)]" />
                </span>
                <h3 className="mt-5 text-[1.0625rem] font-semibold text-[var(--color-ink)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-[1.55] text-[var(--color-slate)]">
                  {item.body}
                </p>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
