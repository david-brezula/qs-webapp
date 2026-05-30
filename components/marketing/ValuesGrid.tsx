import { useTranslations } from "next-intl";
import { Users, ShieldCheck, Clock, Wrench, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";

const ICONS: LucideIcon[] = [Users, ShieldCheck, Clock, Wrench];

export function ValuesGrid() {
  const t = useTranslations("home.values");
  const items = t.raw("items") as { title: string; body: string }[];

  return (
    <section className="relative bg-[var(--color-paper)]">
      <Container className="py-20 md:py-28">
        <Reveal>
          <SectionHeading title={t("title")} lede={t("subtitle")} />
        </Reveal>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <StaggerItem key={i} className="h-full">
                <div className="lift flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-7 shadow-[var(--shadow-card)] hover:border-[var(--color-ink)]/15 hover:shadow-[var(--shadow-float)]">
                  <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-card)] bg-[var(--color-fjord-soft)]">
                    <Icon size={24} strokeWidth={1.5} className="text-[var(--color-fjord)]" />
                  </span>
                  <h3 className="mt-5 text-[1.0625rem] font-semibold text-[var(--color-ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-[1.55] text-[var(--color-slate)]">
                    {item.body}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Container>
    </section>
  );
}
