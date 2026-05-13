import { PROJECTS } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/sections/Reveal";
import { MapPin } from "lucide-react";

function ProjectArt({ seed }: { seed: number }) {
  const offset = (seed * 17) % 60;
  const gridId = `grid-${seed}`;
  const fadeId = `fade-${seed}`;
  return (
    <svg
      viewBox="0 0 320 160"
      className="w-full h-32 rounded-md bg-navy"
      aria-hidden
    >
      <defs>
        <pattern
          id={gridId}
          x={offset}
          y="0"
          width="32"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <rect width="28" height="16" fill="#16315E" rx="1" />
        </pattern>
        <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B1F3A" stopOpacity="0" />
          <stop offset="100%" stopColor="#0B1F3A" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <rect width="320" height="160" fill={`url(#${gridId})`} />
      <rect width="320" height="160" fill={`url(#${fadeId})`} />
      <circle cx="280" cy="32" r="14" fill="#F5B400" opacity="0.85" />
    </svg>
  );
}

export function Projects() {
  return (
    <section id="projects" className="py-24 md:py-32 scroll-mt-20">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Selected projects"
            title="Work delivered for GCs and EPCs."
            lede="A sample of recent subcontracts across utility, C&I, and community solar."
          />
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((p, i) => (
            <Reveal key={`${p.location}-${i}`} delay={i * 0.04}>
              <Card className="p-0 overflow-hidden">
                <ProjectArt seed={i + 1} />
                <div className="p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-accent mb-2">
                    {p.scope}
                  </div>
                  <h3 className="text-lg font-semibold text-navy">{p.size}</h3>
                  <div className="mt-1 flex items-center gap-1 text-sm text-slate-ink">
                    <MapPin size={14} strokeWidth={1.75} />
                    <span>{p.location}</span>
                  </div>
                  <div className="mt-3 text-sm text-slate-ink">
                    Role: <span className="text-navy">{p.role}</span>
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
