import { CONTACT_CTA } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/sections/Reveal";
import { ArrowRight } from "lucide-react";

export function ContactCTA() {
  return (
    <section className="bg-navy text-bg py-24 md:py-32">
      <Container>
        <Reveal>
          <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
                {CONTACT_CTA.headline}
              </h2>
              <p className="mt-4 text-bg/80 max-w-xl text-base md:text-lg leading-relaxed">
                {CONTACT_CTA.sub}
              </p>
            </div>
            <div>
              <Button href={CONTACT_CTA.cta.href} variant="primary">
                {CONTACT_CTA.cta.label}
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
