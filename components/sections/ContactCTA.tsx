import { CONTACT_CTA } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/sections/Reveal";
import { ArrowRight } from "lucide-react";

export function ContactCTA() {
  return (
    <section className="relative overflow-hidden bg-[var(--color-ink)] text-[var(--color-paper)] py-28 md:py-40">
      <svg
        aria-hidden
        viewBox="0 0 320 320"
        className="absolute -right-10 -bottom-10 w-80 h-80 pointer-events-none hidden sm:block"
      >
        {[0, 1, 2, 3].map((r) => (
          <g key={r}>
            {[0, 1, 2, 3].map((c) => (
              <rect
                key={c}
                x={c * 76}
                y={r * 76}
                width="60"
                height="60"
                rx="8"
                fill="#FFFFFF"
                fillOpacity={0.04 + ((r + c) % 3) * 0.03}
              />
            ))}
          </g>
        ))}
      </svg>

      <Container className="relative">
        <Reveal>
          <div className="grid gap-14 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div>
              <div className="mb-7 flex items-center gap-3">
                <span className="h-px w-12 bg-[var(--color-paper)]/40" />
                <span className="eyebrow text-[var(--color-paper)]/80">
                  Open a request · 24h reply
                </span>
              </div>
              <h2
                className="font-display text-[2.25rem] sm:text-[3rem] md:text-[5rem] lg:text-[6rem] leading-[0.98] tracking-[-0.035em]"
                style={{ fontWeight: 700 }}
              >
                {CONTACT_CTA.headline}
              </h2>
              <p className="mt-7 text-[1.0625rem] md:text-[1.125rem] text-[var(--color-paper)]/75 max-w-xl leading-[1.6]">
                {CONTACT_CTA.sub}
              </p>
            </div>
            <div className="md:pb-4">
              <Button href={CONTACT_CTA.cta.href} variant="ember">
                {CONTACT_CTA.cta.label}
                <ArrowRight size={16} strokeWidth={1.5} />
              </Button>

              <div className="mt-8 space-y-2 font-mono text-[0.75rem] uppercase tracking-[0.18em] text-[var(--color-paper)]/55">
                <div>rfp@quantumsphere.eu</div>
                <div>+421 2 5556 0188</div>
                <div>Mlynské Nivy 5 · Bratislava</div>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
