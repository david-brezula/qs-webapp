import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/motion";

export function ContactCta({ heading }: { heading: string }) {
  const tNav = useTranslations("nav");

  return (
    <section className="relative overflow-hidden bg-[var(--color-ink)]">
      {/* Atmospheric glows. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-drift absolute -left-20 -top-24 h-[28rem] w-[28rem] rounded-full bg-[var(--color-fjord)]/20 blur-[120px]" />
        <div className="animate-drift-slow absolute -bottom-24 right-0 h-[24rem] w-[24rem] rounded-full bg-[var(--color-fjord)]/10 blur-[120px]" />
      </div>
      {/* Faint white engineering grid. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 80% at 50% 50%, #000 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 80% at 50% 50%, #000 30%, transparent 100%)",
        }}
      />

      <Container className="relative py-20 text-center md:py-28">
        <Reveal>
          <h2
            className="mx-auto max-w-3xl font-display text-[2rem] tracking-[-0.03em] text-[var(--color-paper)] md:text-[3rem]"
            style={{ fontWeight: 700 }}
          >
            {heading}
          </h2>
          <div className="mt-10">
            <Link href="/contact" className={buttonClass("ghost")}>
              {tNav("contact")}
              <ArrowRight
                size={15}
                strokeWidth={1.5}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
