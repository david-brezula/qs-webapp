import { CONTACT_CTA } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/sections/Reveal";
import { ArrowRight } from "lucide-react";

export function ContactCTA() {
  return (
    <section className="relative overflow-hidden bg-[var(--color-ink)] text-[var(--color-paper)] py-28 md:py-40">
      {/* Decorative concentric arcs */}
      <svg
        aria-hidden
        viewBox="0 0 800 600"
        className="absolute -right-40 -bottom-40 w-[700px] h-[700px] opacity-25 pointer-events-none hidden sm:block"
      >
        <defs>
          <radialGradient id="cta-ring" cx="400" cy="600" r="600" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#B45A3C" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#B45A3C" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="400" cy="600" r="500" fill="url(#cta-ring)" />
        {[120, 200, 280, 360, 440, 520].map((r) => (
          <circle
            key={r}
            cx="400"
            cy="600"
            r={r}
            fill="none"
            stroke="#F4EFE6"
            strokeOpacity="0.25"
            strokeWidth="0.6"
          />
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
                className="font-display text-[2.25rem] sm:text-[3rem] md:text-[5rem] lg:text-[6rem] leading-[0.96] tracking-[-0.035em]"
                style={{ fontWeight: 320 }}
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
