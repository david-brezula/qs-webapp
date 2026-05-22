import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SERVICES } from "@/lib/services";
import { ServiceCard } from "./ServiceCard";

export function ServicesGrid() {
  const t = useTranslations("home.services");

  return (
    <section className="border-y border-[var(--color-rule)] bg-[var(--color-canvas)]">
      <Container className="py-20 md:py-28">
        <SectionHeading title={t("title")} lede={t("subtitle")} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ slug, internalPath, icon }) => (
            <ServiceCard key={slug} slug={slug} internalPath={internalPath} Icon={icon} />
          ))}
        </div>
      </Container>
    </section>
  );
}
