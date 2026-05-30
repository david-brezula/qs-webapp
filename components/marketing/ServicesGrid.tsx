import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { SERVICES } from "@/lib/services";
import { ServiceCard } from "./ServiceCard";

export function ServicesGrid() {
  const t = useTranslations("home.services");

  return (
    <section className="relative border-y border-[var(--color-rule)] bg-[var(--color-canvas)]">
      <Container className="py-20 md:py-28">
        <Reveal>
          <SectionHeading title={t("title")} lede={t("subtitle")} />
        </Reveal>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ slug, internalPath, icon }) => (
            <StaggerItem key={slug} className="h-full">
              <ServiceCard slug={slug} internalPath={internalPath} Icon={icon} />
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
