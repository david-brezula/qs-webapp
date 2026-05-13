import { CAPABILITIES } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
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
    <section id="capabilities" className="py-24 md:py-32 scroll-mt-20">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Capabilities"
            title="A subcontractor that scales with your project."
            lede="Quantum Sphere crews handle the work that keeps a solar build on schedule — from racking through commissioning."
          />
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => {
            const Icon = ICONS[c.icon] ?? Sun;
            return (
              <Reveal key={c.title} delay={i * 0.05}>
                <Card>
                  <div className="h-10 w-10 rounded-md bg-navy/5 text-navy flex items-center justify-center mb-5">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-semibold text-navy">{c.title}</h3>
                  <p className="mt-2 text-sm text-slate-ink leading-relaxed">
                    {c.body}
                  </p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
