import { STATS } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/sections/Reveal";

export function Stats() {
  return (
    <section className="py-16 bg-navy text-bg">
      <Container>
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center md:text-left">
                <div className="text-4xl md:text-5xl font-semibold tracking-tight text-accent">
                  {s.value}
                </div>
                <div className="mt-2 text-sm uppercase tracking-[0.15em] text-bg/70">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
