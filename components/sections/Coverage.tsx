import Image from "next/image";
import { COVERAGE_STATES } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/sections/Reveal";

export function Coverage() {
  return (
    <section id="coverage" className="py-24 md:py-32 scroll-mt-20">
      <Container className="grid gap-12 md:grid-cols-[1.3fr_1fr] md:items-center">
        <Reveal>
          <div className="relative w-full aspect-[5/3] rounded-lg bg-bg border border-border-soft overflow-hidden">
            <Image
              src="/coverage-map.svg"
              alt="Map of US states where Quantum Sphere operates"
              fill
              className="object-contain p-4"
            />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <SectionHeading
            eyebrow="Coverage"
            title="Crews where you need them."
            lede="Mobilizing nationwide. Standing operations in 12 states; we can deploy to others on a project basis."
          />
          <ul className="mt-8 grid grid-cols-4 gap-2 text-sm font-medium text-navy">
            {COVERAGE_STATES.map((s) => (
              <li
                key={s}
                className="border border-border-soft rounded-md py-2 text-center bg-surface"
              >
                {s}
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
