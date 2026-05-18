import { PROJECTS } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/sections/Reveal";
import { MapPin } from "lucide-react";

function ProjectArt({ seed, scope }: { seed: number; scope: string }) {
  const variant = seed % 3;
  return (
    <svg viewBox="0 0 400 220" className="w-full h-40 md:h-44" aria-hidden>
      <defs>
        <linearGradient id={`fjord-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E5E6E" />
          <stop offset="100%" stopColor="#1F4453" />
        </linearGradient>
        <pattern
          id={`dots-${seed}`}
          x="0"
          y="0"
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="0.6" fill="#F4EFE6" opacity="0.4" />
        </pattern>
      </defs>
      <rect width="400" height="220" fill={`url(#fjord-${seed})`} />
      <rect width="400" height="220" fill={`url(#dots-${seed})`} />

      {variant === 0 && (
        // Ground-mount horizon
        <g stroke="#F4EFE6" strokeOpacity="0.65" strokeWidth="0.8" fill="none">
          <line x1="0" y1="155" x2="400" y2="155" />
          <path d="M 30 145 L 100 130 L 170 145 L 240 130 L 310 145 L 380 130" />
          <path d="M 30 165 L 100 150 L 170 165 L 240 150 L 310 165 L 380 150" opacity="0.4" />
          <circle cx="330" cy="55" r="22" fill="#B45A3C" opacity="0.92" />
        </g>
      )}
      {variant === 1 && (
        // Rooftop with stepped panels
        <g stroke="#F4EFE6" strokeOpacity="0.75" strokeWidth="0.8" fill="none">
          <rect x="60" y="120" width="280" height="60" />
          <line x1="60" y1="140" x2="340" y2="140" />
          <line x1="60" y1="160" x2="340" y2="160" />
          <line x1="130" y1="120" x2="130" y2="180" />
          <line x1="200" y1="120" x2="200" y2="180" />
          <line x1="270" y1="120" x2="270" y2="180" />
          <circle cx="320" cy="55" r="18" fill="#B45A3C" opacity="0.92" />
        </g>
      )}
      {variant === 2 && (
        // Tracker rows
        <g stroke="#F4EFE6" strokeOpacity="0.7" strokeWidth="0.8" fill="none">
          {[0, 1, 2, 3].map((r) => (
            <g key={r} transform={`translate(0, ${110 + r * 22})`}>
              <line x1="30" y1="0" x2="370" y2="0" />
              {Array.from({ length: 14 }).map((_, c) => (
                <line key={c} x1={30 + c * 25} y1="-6" x2={30 + c * 25} y2="6" />
              ))}
            </g>
          ))}
          <circle cx="60" cy="55" r="14" fill="#B45A3C" opacity="0.92" />
        </g>
      )}

      {/* Scope label */}
      <text
        x="20"
        y="32"
        fontFamily="JetBrains Mono, ui-monospace"
        fontSize="9"
        fill="#F4EFE6"
        letterSpacing="2"
      >
        {scope.toUpperCase()}
      </text>
      <text
        x="380"
        y="32"
        fontFamily="JetBrains Mono, ui-monospace"
        fontSize="9"
        fill="#F4EFE6"
        textAnchor="end"
        letterSpacing="2"
      >
        EU‑{String(seed).padStart(3, "0")}
      </text>
    </svg>
  );
}

export function Projects() {
  return (
    <section id="projects" className="py-28 md:py-36 scroll-mt-20">
      <Container>
        <Reveal>
          <SectionHeading
            index="§ 03"
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
                <ProjectArt seed={i + 1} scope={p.scope} />
                <div className="p-7 md:p-8 flex-1 flex flex-col">
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
