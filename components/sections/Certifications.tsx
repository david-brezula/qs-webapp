import { CERTIFICATIONS } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/sections/Reveal";

export function Certifications() {
  return (
    <section
      id="certifications"
      className="py-28 md:py-36 bg-[var(--color-paper-2)] border-y border-[var(--color-rule)] scroll-mt-20"
    >
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Standards · safety · insurance"
            title={
              <>
                The procurement checklist,
                <span className="block text-[var(--color-fjord)]">
                  already answered.
                </span>
              </>
            }
            lede="Audited annually. Documentation packs available under NDA for tender review."
          />
        </Reveal>

        <div className="mt-14 md:mt-16">
          {CERTIFICATIONS.map((c, i) => (
            <Reveal key={c.label} delay={i * 0.04}>
              <div
                className={`grid grid-cols-1 md:grid-cols-[200px_1fr_60px] lg:grid-cols-[280px_1fr_60px] gap-3 md:gap-12 py-6 md:py-7 items-baseline ${
                  i === 0 ? "border-t border-[var(--color-rule)]" : ""
                } border-b border-[var(--color-rule)]`}
              >
                <div className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-ink)]">
                  {c.label}
                </div>
                <div className="text-[1rem] md:text-[1.0625rem] text-[var(--color-ink)] leading-[1.55]">
                  {c.value}
                </div>
                <div className="hidden md:block numeral text-[0.75rem] text-[var(--color-mist)] text-right">
                  {String(i + 1).padStart(2, "0")}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
