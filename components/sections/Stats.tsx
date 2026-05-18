import { STATS } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/sections/Reveal";

export function Stats() {
  return (
    <section className="relative py-20 md:py-24 bg-[var(--color-paper-2)] border-y border-[var(--color-rule)]">
      <Container>
        <Reveal>
          <div className="flex items-baseline justify-between mb-10 pb-3 border-b border-[var(--color-rule)]">
            <span className="eyebrow text-[var(--color-ink)]">Specimen · operating record</span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--color-mist)]">
              YoY through Q1 2026
            </span>
          </div>
        </Reveal>

        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`py-3 md:py-4 ${
                  i !== 0 ? "md:border-l md:border-[var(--color-rule)] md:pl-8" : ""
                } ${i !== 0 && i % 2 === 0 ? "" : ""}`}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="numeral text-[2.5rem] sm:text-[3.5rem] md:text-[4.5rem] leading-none tracking-[-0.04em] text-[var(--color-ink)]"
                    style={{ fontWeight: 500 }}
                  >
                    {s.value}
                  </span>
                  <span className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-[var(--color-ember)]">
                    {s.unit}
                  </span>
                </div>
                <div className="mt-3 text-[0.8125rem] text-[var(--color-slate)] leading-snug max-w-[12rem]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
