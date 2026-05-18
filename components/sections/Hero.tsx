import { HERO } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/sections/Reveal";
import { ArrowRight, ArrowDownRight } from "lucide-react";

function HeroVisual() {
  return (
    <svg viewBox="0 0 520 560" className="w-full h-auto" aria-hidden>
      <rect width="520" height="560" rx="16" fill="#F1F3F5" />
      <circle cx="372" cy="150" r="66" fill="#2563EB" />
      {[0, 1, 2].map((row) => (
        <g key={row} opacity={0.4 + row * 0.3}>
          {[0, 1, 2].map((col) => (
            <rect
              key={col}
              x={48 + col * 148}
              y={300 + row * 80}
              width="124"
              height="56"
              rx="8"
              fill="#2563EB"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative pt-10 md:pt-16 pb-24 md:pb-36 overflow-hidden">
      <Container className="relative">
        <div className="grid gap-14 md:gap-20 md:grid-cols-[1.15fr_1fr] md:items-end">
          <Reveal>
            <span className="eyebrow text-[var(--color-slate)]">{HERO.eyebrow}</span>
            <h1
              className="mt-6 font-display text-[2.25rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.25rem] leading-[1.02] tracking-[-0.035em] text-[var(--color-ink)]"
              style={{ fontWeight: 700 }}
            >
              {HERO.headline.split("—")[0]}
              <span className="block">
                <span className="text-[var(--color-ember)]">
                  {HERO.headline.split("—")[1]}
                </span>
              </span>
            </h1>

            <p className="mt-9 max-w-xl text-[1.0625rem] md:text-[1.125rem] leading-[1.6] text-[var(--color-slate)]">
              {HERO.sub}
            </p>

            <div className="mt-10 flex flex-wrap gap-3 items-center">
              <Button href={HERO.primaryCta.href} variant="primary">
                {HERO.primaryCta.label}
                <ArrowRight size={15} strokeWidth={1.5} />
              </Button>
              <a
                href={HERO.secondaryCta.href}
                className="group inline-flex items-center gap-2 text-[0.875rem] text-[var(--color-ink)] hover:text-[var(--color-fjord)] transition-colors px-3 py-2"
              >
                {HERO.secondaryCta.label}
                <ArrowDownRight
                  size={14}
                  strokeWidth={1.5}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5"
                />
              </a>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-6 max-w-md">
              {[
                { k: "ISO 9001 · 14001 · 45001", v: "Quality, environment, safety" },
                { k: "DGUV qualified", v: "On every site" },
                { k: "VDE · OVE · SIA", v: "Compliant crews" },
              ].map((item) => (
                <div key={item.k}>
                  <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink)]">
                    {item.k}
                  </div>
                  <div className="text-[0.6875rem] text-[var(--color-mist)] mt-1 leading-snug">
                    {item.v}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <HeroVisual />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
