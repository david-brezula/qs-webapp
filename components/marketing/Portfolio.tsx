import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/motion";
import { ProjectGrid } from "./ProjectGrid";

// Homepage "Selected projects" section: heading + the shared, filterable
// ProjectGrid (cards link to their case studies).
export function Portfolio() {
  const t = useTranslations("home.featuredProjects");

  return (
    <section className="border-y border-[var(--color-rule)] bg-[var(--color-canvas)]">
      <Container className="py-20 md:py-28">
        <Reveal>
          <SectionHeading title={t("title")} lede={t("subtitle")} />
        </Reveal>
        <div className="mt-10">
          <ProjectGrid />
        </div>
      </Container>
    </section>
  );
}
