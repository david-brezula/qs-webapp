import { CAPABILITIES } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/sections/Reveal";
import {
  Sun,
  LandPlot,
  Layers,
  Zap,
  CircuitBoard,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Sun,
  LandPlot,
  Layers,
  Zap,
  CircuitBoard,
  Wrench,
};

export function Capabilities() {
  return (
    <section id="capabilities" className="py-28 md:py-36 scroll-mt-20">
      <Container>
        <Reveal>
          <SectionHeading
            index="§ 01"
            eyebrow="Capabilities"
            title={
              <>
                Scope your crew can sign for,
                <span
                  className="italic text-[var(--color-fjord)] block"
                  style={{ fontVariationSettings: "'SOFT' 100, 'opsz' 144" }}
                >
                  end to end.
                </span>
              </>
            }
            lede="Quantum Sphere crews handle the work that keeps a European solar build on schedule — from foundation through commissioning, to grid‑operator standards."
          />
        </Reveal>

        <div className="mt-16 md:mt-20 grid gap-px bg-[var(--color-rule)] md:grid-cols-2 lg:grid-cols-3 border border-[var(--color-rule)]">
          {CAPABILITIES.map((c, i) => {
            const Icon = ICONS[c.icon] ?? Sun;
            const num = String(i + 1).padStart(2, "0");
            return (
              <Reveal key={c.title} delay={i * 0.04}>
                <article className="relative group bg-[var(--color-paper)] hover:bg-[var(--color-canvas)] transition-colors duration-500 p-8 md:p-10 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-8">
                    <div className="h-9 w-9 md:h-11 md:w-11 rounded-full border border-[var(--color-ink)] flex items-center justify-center text-[var(--color-ink)] transition-colors group-hover:bg-[var(--color-ink)] group-hover:text-[var(--color-paper)]">
                      <Icon size={18} strokeWidth={1.5} />
                    </div>
                    <span className="numeral text-[0.75rem] uppercase tracking-[0.18em] text-[var(--color-mist)]">
                      {num} / {String(CAPABILITIES.length).padStart(2, "0")}
                    </span>
                  </div>

                  <h3
                    className="font-display text-[1.5rem] tracking-[-0.02em] text-[var(--color-ink)] leading-tight"
                    style={{ fontWeight: 400 }}
                  >
                    {c.title}
                  </h3>
                  <p className="mt-3 text-[0.9375rem] leading-[1.6] text-[var(--color-slate)]">
                    {c.body}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
