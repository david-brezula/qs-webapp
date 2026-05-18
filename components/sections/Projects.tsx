import { PROJECTS } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/sections/Reveal";
import { MapPin } from "lucide-react";

function ProjectArt({ seed }: { seed: number }) {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-40 md:h-44" aria-hidden>
      <rect width="400" height="220" fill="#0F172A" />
      {Array.from({ length: 4 }).map((_, r) => (
        <g key={r}>
          {Array.from({ length: 6 }).map((_, c) => (
            <rect
              key={c}
              x={34 + c * 58}
              y={42 + r * 36}
              width="48"
              height="26"
              rx="4"
              fill="#2563EB"
              fillOpacity={0.3 + ((r + c + seed) % 3) * 0.32}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function Projects() {
  return (
    <section id="projects" className="py-28 md:py-36 scroll-mt-20">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Selected projects"
            title={
              <>
                Work delivered for European EPCs and GCs.
              </>
            }
            lede="A sample of recent subcontracts across utility, C&I and community solar — from German trackers to Swiss canopies."
          />
        </Reveal>

        <div className="mt-16 md:mt-20 grid gap-px bg-[var(--color-rule)] md:grid-cols-2 lg:grid-cols-3 border border-[var(--color-rule)]">
          {PROJECTS.map((p, i) => (
            <Reveal key={`${p.location}-${i}`} delay={i * 0.04}>
              <article className="group bg-[var(--color-canvas)] overflow-hidden h-full flex flex-col">
                <ProjectArt seed={i + 1} />
                <div className="p-5 md:p-8 flex-1 flex flex-col">
                  <div className="flex items-baseline justify-between mb-4">
                    <span
                      className="numeral text-[1.5rem] md:text-[1.75rem] tracking-[-0.02em] text-[var(--color-ink)] leading-none"
                      style={{ fontWeight: 500 }}
                    >
                      {p.size}
                    </span>
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-[var(--color-ember)]">
                      {p.scope}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[0.875rem] text-[var(--color-slate)]">
                    <MapPin size={13} strokeWidth={1.5} />
                    <span>{p.location}</span>
                  </div>

                  <div className="mt-auto pt-5 mt-5 border-t border-[var(--color-rule)] text-[0.8125rem] text-[var(--color-slate)]">
                    Role <span className="text-[var(--color-ink)] ml-2">{p.role}</span>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
