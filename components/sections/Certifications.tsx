import { CERTIFICATIONS } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/sections/Reveal";

export function Certifications() {
  return (
    <section id="certifications" className="py-24 md:py-32 bg-surface scroll-mt-20">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Certifications & safety"
            title="The procurement checklist, already answered."
          />
        </Reveal>

        <div className="mt-12 divide-y divide-border-soft border-y border-border-soft">
          {CERTIFICATIONS.map((c) => (
            <div
              key={c.label}
              className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 md:gap-8 py-5"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-navy">
                {c.label}
              </div>
              <div className="text-sm md:text-base text-slate-ink">{c.value}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
