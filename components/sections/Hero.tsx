import Image from "next/image";
import { HERO } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/sections/Reveal";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="pt-12 md:pt-20 pb-24 md:pb-32">
      <Container className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:items-center">
        <Reveal>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/60 mb-5">
            {HERO.eyebrow}
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight text-navy">
            {HERO.headline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-ink max-w-xl">
            {HERO.sub}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button href={HERO.primaryCta.href} variant="primary">
              {HERO.primaryCta.label}
              <ArrowRight size={16} />
            </Button>
            <Button href={HERO.secondaryCta.href} variant="secondary">
              {HERO.secondaryCta.label}
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative aspect-square w-full max-w-[520px] ml-auto">
            <Image
              src="/panel-grid.svg"
              alt=""
              fill
              priority
              className="object-contain"
            />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
