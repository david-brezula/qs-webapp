import { PROCESS_STEPS } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/sections/Reveal";

export function Process() {
  return (
    <section id="process" className="py-24 md:py-32 bg-surface scroll-mt-20">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Process"
            title="How a Quantum Sphere subcontract runs."
            lede="A repeatable handoff between your project team and ours."
          />
        </Reveal>

        <div className="mt-14 grid gap-8 md:grid-cols-5">
          {PROCESS_STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.05}>
              <div className="relative">
                <div className="text-xs font-semibold tracking-[0.2em] text-accent mb-3">
                  STEP {step.n}
                </div>
                <h3 className="text-lg font-semibold text-navy">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-ink leading-relaxed">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
