import { COVERAGE_COUNTRIES } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/sections/Reveal";

/**
 * Approximate offset of each operating country from Bratislava (SK).
 * Negative x = west, negative y = north. Scaled for the radial display.
 */
const COORDS: Record<string, { dx: number; dy: number }> = {
  SK: { dx: 0, dy: 0 },
  AT: { dx: -50, dy: 0 },
  CZ: { dx: -30, dy: -40 },
  DE: { dx: -130, dy: -50 },
  CH: { dx: -180, dy: -10 },
  SE: { dx: -70, dy: -260 },
  NO: { dx: -180, dy: -290 },
  DK: { dx: -120, dy: -180 },
  FI: { dx: 30, dy: -280 },
};

export function Coverage() {
  return (
    <section id="coverage" className="py-28 md:py-36 scroll-mt-20">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Coverage"
            title={
              <>
                Crews where the
                <span className="text-[var(--color-fjord)]">
                  {" "}
                  sun{" "}
                </span>
                meets the schedule.
              </>
            }
            lede="Headquartered in Bratislava with continuous operations across DACH and rotating crews into Scandinavia. Project‑basis mobilisation everywhere else in the EU."
          />
        </Reveal>

        <div className="mt-16 md:mt-20 grid gap-14 md:grid-cols-[1.1fr_1fr] md:items-center">
          {/* Radial map */}
          <Reveal>
            <div className="relative bg-[var(--color-canvas)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-6 md:p-10 aspect-[5/4]">
              <svg viewBox="-220 -340 440 440" className="w-full h-full">
                <rect x="-220" y="-340" width="440" height="440" fill="#F7F8FA" />
                {COVERAGE_COUNTRIES.filter((c) => c.code !== "SK").map((c) => {
                  const co = COORDS[c.code];
                  if (!co) return null;
                  return (
                    <line
                      key={`l-${c.code}`}
                      x1="0"
                      y1="0"
                      x2={co.dx}
                      y2={co.dy}
                      stroke="#94A3B8"
                      strokeWidth="1"
                    />
                  );
                })}
                {COVERAGE_COUNTRIES.map((c) => {
                  const co = COORDS[c.code];
                  if (!co) return null;
                  const isHQ = c.code === "SK";
                  return (
                    <circle
                      key={c.code}
                      cx={co.dx}
                      cy={co.dy}
                      r={isHQ ? 11 : 5.5}
                      fill={isHQ ? "#2563EB" : "#0F172A"}
                    />
                  );
                })}
              </svg>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div>
              <ul className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
                {COVERAGE_COUNTRIES.map((c) => (
                  <li
                    key={c.code}
                    className="flex items-center justify-between py-3.5"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="font-mono text-[0.75rem] uppercase tracking-[0.2em] text-[var(--color-ink)] w-8">
                        {c.code}
                      </span>
                      <span
                        className="font-display text-[1.0625rem] tracking-[-0.015em] text-[var(--color-ink)]"
                        style={{ fontWeight: 400 }}
                      >
                        {c.name}
                      </span>
                    </div>
                    <span className="text-[0.8125rem] text-[var(--color-slate)] hidden sm:inline">
                      {c.note}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[0.875rem] text-[var(--color-mist)] leading-relaxed max-w-md">
                Beyond the listed jurisdictions, Quantum Sphere mobilises on a
                project basis across the EU. Ask us about your site.
              </p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
