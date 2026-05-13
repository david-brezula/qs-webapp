import Image from "next/image";
import { TESTIMONIAL } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/sections/Reveal";

const LOGOS = [
  "/logos/partner-1.svg",
  "/logos/partner-2.svg",
  "/logos/partner-3.svg",
  "/logos/partner-4.svg",
  "/logos/partner-5.svg",
  "/logos/partner-6.svg",
];

export function Testimonials() {
  return (
    <section className="py-24 md:py-32 bg-surface">
      <Container>
        <Reveal>
          <figure className="max-w-3xl mx-auto text-center">
            <blockquote className="text-2xl md:text-3xl font-medium tracking-tight text-navy leading-snug">
              &ldquo;{TESTIMONIAL.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 text-sm uppercase tracking-[0.2em] text-slate-ink">
              {TESTIMONIAL.attribution}
            </figcaption>
          </figure>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center opacity-70">
            {LOGOS.map((src, i) => (
              <div key={src} className="relative h-10 w-full">
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
