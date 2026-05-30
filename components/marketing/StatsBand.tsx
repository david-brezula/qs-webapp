import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { Stagger, StaggerItem, CountUp } from "@/components/ui/motion";

export function StatsBand() {
  const t = useTranslations("home.stats");
  const items = t.raw("items") as { value: string; label: string }[];

  return (
    <section className="border-y border-[var(--color-rule)] bg-[var(--color-canvas-2)]">
      <Container className="py-14 md:py-20">
        <Stagger className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-feature)] border border-[var(--color-rule)] bg-[var(--color-rule)] shadow-[var(--shadow-card)] md:grid-cols-4">
          {items.map((item, i) => (
            <StaggerItem key={i} className="h-full">
              <div className="h-full bg-[var(--color-paper)] p-7 md:p-8">
                <CountUp
                  value={item.value}
                  className="numeral block text-[2.5rem] leading-none text-[var(--color-ink)] md:text-[3.25rem]"
                />
                <span className="mt-3 block text-[0.9375rem] leading-[1.45] text-[var(--color-slate)]">
                  {item.label}
                </span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
