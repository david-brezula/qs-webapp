import { TESTIMONIAL, PARTNERS } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/sections/Reveal";

export function Testimonials() {
  return (
    <section className="py-28 md:py-40 bg-[var(--color-paper-2)] border-y border-[var(--color-rule)]">
      <Container>
        <Reveal>
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-10 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-[var(--color-rule)]" />
              <span className="eyebrow text-[var(--color-ink)]">
                Voice · construction director
              </span>
              <span className="h-px w-10 bg-[var(--color-rule)]" />
            </div>

            <blockquote>
              <span
                className="font-display text-[1.875rem] sm:text-[2.5rem] md:text-[3.25rem] leading-[1.08] tracking-[-0.025em] text-[var(--color-ink)] block"
                style={{ fontWeight: 600 }}
              >
                <span
                  className="text-[var(--color-ember)] mr-1"
                >
                  &ldquo;
                </span>
                {TESTIMONIAL.quote}
                <span
                  className="text-[var(--color-ember)] ml-1"
                >
                  &rdquo;
                </span>
              </span>
            </blockquote>

            <figcaption className="mt-10 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[var(--color-slate)]">
              — {TESTIMONIAL.attribution}
            </figcaption>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-20 pt-10 border-t border-[var(--color-rule)]">
            <div className="text-center eyebrow text-[var(--color-mist)] mb-8">
              Trusted by European EPCs
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-5 items-center">
              {PARTNERS.map((name) => (
                <div
                  key={name}
                  className="text-center font-display text-[1.0625rem] tracking-[-0.01em] text-[var(--color-slate)] opacity-80 hover:opacity-100 transition-opacity"
                  style={{ fontWeight: 400 }}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
