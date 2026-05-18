import { PROCESS_STEPS } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/sections/Reveal";

export function Process() {
  return (
    <section
      id="process"
      className="py-28 md:py-36 bg-[var(--color-paper-2)] scroll-mt-20 border-y border-[var(--color-rule)]"
    >
      <Container>
        <Reveal>
          <SectionHeading
            index="§ 02"
            eyebrow="Method"
            title={
              <>
                How a Quantum Sphere subcontract{" "}
                <span
                  className="italic"
                  style={{ fontVariationSettings: "'SOFT' 100, 'opsz' 144" }}
                >
                  actually
                </span>{" "}
                runs.
              </>
            }
            lede="A repeatable handoff between your project team and ours — written down, then audited at every stage."
          />
        </Reveal>

        <div className="mt-16 md:mt-20">
          {PROCESS_STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.05}>
              <div
                className={`grid grid-cols-[auto_1fr] md:grid-cols-[100px_minmax(0,250px)_1fr] gap-x-6 md:gap-x-12 gap-y-2 py-8 md:py-10 ${
                  i !== PROCESS_STEPS.length - 1
                    ? "border-b border-[var(--color-rule)]"
                    : ""
                }`}
              >
                <div className="numeral text-[var(--color-ember)] text-[0.875rem] tracking-[0.1em] pt-1">
                  {step.n}
                </div>
                <h3
                  className="font-display text-[1.75rem] md:text-[2.25rem] tracking-[-0.025em] leading-none text-[var(--color-ink)]"
                  style={{ fontWeight: 400 }}
                >
                  {step.title}
                </h3>
                <p className="col-span-2 md:col-span-1 text-[0.9375rem] md:text-base leading-[1.6] text-[var(--color-slate)] max-w-prose md:pt-1">
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
