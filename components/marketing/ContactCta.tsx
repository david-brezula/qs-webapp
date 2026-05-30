import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/Button";

export function ContactCta({ heading }: { heading: string }) {
  const tNav = useTranslations("nav");

  return (
    <section className="bg-[var(--color-ink)]">
      <Container className="py-20 md:py-28 text-center">
        <h2
          className="font-display text-[2rem] md:text-[3rem] tracking-[-0.025em] text-[var(--color-paper)] max-w-3xl mx-auto"
          style={{ fontWeight: 700 }}
        >
          {heading}
        </h2>
        <div className="mt-10">
          <Link href="/contact" className={buttonClass("ghost")}>
            {tNav("contact")}
            <ArrowRight size={15} strokeWidth={1.5} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
