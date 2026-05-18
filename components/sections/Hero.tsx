import { HERO } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/sections/Reveal";
import { ArrowRight, ArrowDownRight } from "lucide-react";

function NorthernArt() {
  return (
    <svg
      viewBox="0 0 520 560"
      className="w-full h-auto"
      aria-hidden
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4EFE6" />
          <stop offset="55%" stopColor="#E8DECB" />
          <stop offset="100%" stopColor="#D6C7AC" />
        </linearGradient>
        <linearGradient id="disc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B45A3C" />
          <stop offset="100%" stopColor="#7E3C28" />
        </linearGradient>
        <pattern id="dot-grid" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.7" fill="#161B22" opacity="0.18" />
        </pattern>
      </defs>

      {/* Outer card */}
      <rect x="0" y="0" width="520" height="560" fill="url(#sky)" />

      {/* Hairline frame */}
      <rect x="12" y="12" width="496" height="536" fill="none" stroke="#161B22" strokeOpacity="0.25" strokeWidth="0.75" />

      {/* Top metadata label */}
      <g fontFamily="JetBrains Mono, ui-monospace" fontSize="9" fill="#161B22" opacity="0.55">
        <text x="28" y="36" letterSpacing="2">N 48°08′</text>
        <text x="430" y="36" letterSpacing="2">E 17°06′</text>
        <text x="28" y="540" letterSpacing="2">QS · BTS</text>
        <text x="395" y="540" letterSpacing="2">PLATE 01 / VI</text>
      </g>

      {/* Horizon line */}
      <line x1="28" y1="360" x2="492" y2="360" stroke="#161B22" strokeOpacity="0.65" strokeWidth="0.8" />

      {/* Sun disc — the conceptual heart */}
      <circle cx="260" cy="260" r="120" fill="url(#disc)" />
      {/* Outer ring */}
      <circle cx="260" cy="260" r="160" fill="none" stroke="#161B22" strokeOpacity="0.4" strokeWidth="0.6" />
      <circle cx="260" cy="260" r="200" fill="none" stroke="#161B22" strokeOpacity="0.2" strokeWidth="0.5" strokeDasharray="2 4" />

      {/* Tick marks on the disc */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 24;
        const x1 = 260 + Math.cos(angle) * 162;
        const y1 = 260 + Math.sin(angle) * 162;
        const x2 = 260 + Math.cos(angle) * (i % 6 === 0 ? 175 : 168);
        const y2 = 260 + Math.sin(angle) * (i % 6 === 0 ? 175 : 168);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#161B22"
            strokeOpacity="0.6"
            strokeWidth="0.7"
          />
        );
      })}

      {/* Vertical centerline */}
      <line x1="260" y1="60" x2="260" y2="500" stroke="#161B22" strokeOpacity="0.35" strokeWidth="0.5" strokeDasharray="3 5" />

      {/* PV array dot field rising from horizon */}
      <rect x="80" y="370" width="360" height="120" fill="url(#dot-grid)" />

      {/* Stepped panels — abstracted */}
      <g stroke="#161B22" strokeOpacity="0.7" strokeWidth="0.8" fill="none">
        <path d="M 80 470 L 200 430 L 320 460 L 440 420" />
        <path d="M 80 490 L 200 450 L 320 480 L 440 440" strokeOpacity="0.35" />
      </g>

      {/* Bottom rule label */}
      <g fontFamily="JetBrains Mono, ui-monospace" fontSize="9" fill="#161B22" opacity="0.7" letterSpacing="2">
        <text x="260" y="385" textAnchor="middle">HORIZON · 0.0</text>
      </g>

      {/* Compass marker */}
      <g transform="translate(460,490)" stroke="#161B22" strokeOpacity="0.65" fill="none">
        <circle r="18" />
        <line x1="0" y1="-22" x2="0" y2="-14" />
        <line x1="0" y1="14" x2="0" y2="22" />
        <line x1="-22" y1="0" x2="-14" y2="0" />
        <line x1="14" y1="0" x2="22" y2="0" />
        <text x="0" y="-25" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace" fontSize="8" fill="#161B22" letterSpacing="1.5">N</text>
      </g>
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative pt-10 md:pt-16 pb-24 md:pb-36 overflow-hidden">
      {/* Decorative hairline grid behind */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(22,27,34,0.06) 1px, transparent 1px)",
          backgroundSize: "calc(100% / 12) 100%",
        }}
      />

      <Container className="relative">
        {/* Metadata header strip */}
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-8 mb-14 border-b border-[var(--color-rule)]">
            <span className="eyebrow text-[var(--color-ink)]">{HERO.eyebrow}</span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-[var(--color-mist)]">
              Vol. 07 · DACH + Nordics edition
            </span>
          </div>
        </Reveal>

        <div className="grid gap-14 md:gap-20 md:grid-cols-[1.15fr_1fr] md:items-end">
          <Reveal>
            {/* Drop-cap headline */}
            <h1
              className="font-display text-[2.25rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.25rem] leading-[0.98] tracking-[-0.035em] text-[var(--color-ink)]"
              style={{
                fontWeight: 350,
                fontVariationSettings: "'SOFT' 30, 'opsz' 144",
              }}
            >
              {HERO.headline.split("—")[0]}
              <span className="block">
                <span className="text-[var(--color-ember)] italic" style={{ fontVariationSettings: "'SOFT' 100, 'opsz' 144" }}>
                  —{HERO.headline.split("—")[1]}
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

            {/* Tiny credential row */}
            <div className="mt-14 grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-6 max-w-md">
              {[
                { k: "ISO 9001 · 14001 · 45001", v: "Quality, environment, safety" },
                { k: "DGUV qualified", v: "On every site" },
                { k: "VDE · OVE · SIA", v: "Compliant crews" },
              ].map((item) => (
                <div key={item.k}>
                  <div className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--color-ink)]">
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
            <div className="relative">
              <NorthernArt />
              <div className="mt-3 flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-mist)]">
                <span>Plate · sun disc + panel array</span>
                <span>fig. 01</span>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
