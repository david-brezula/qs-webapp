import { useTranslations, useLocale } from "next-intl";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { localizedPathname, SITE_URL } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/motion";
import { ProjectGrid } from "./ProjectGrid";
import { ContactCta } from "./ContactCta";

// Body of the /work index page: heading + shared ProjectGrid + contact CTA.
export function ProjectsIndex() {
  const t = useTranslations("projects");
  const tNav = useTranslations("nav");
  const locale = useLocale();

  const homeUrl = `${SITE_URL}${localizedPathname("/", locale)}`;
  const indexUrl = `${SITE_URL}${localizedPathname("/work", locale)}`;

  return (
    <div>
      <JsonLd
        data={breadcrumbSchema([
          { name: tNav("home"), url: homeUrl },
          { name: t("index.title"), url: indexUrl },
        ])}
      />

      <section className="bg-[var(--color-canvas)]">
        <Container className="py-16 md:py-24">
          <Reveal>
            <SectionHeading
              eyebrow={tNav("work")}
              title={t("index.title")}
              lede={t("index.subtitle")}
            />
          </Reveal>
          <div className="mt-12">
            <ProjectGrid />
          </div>
        </Container>
      </section>

      <ContactCta heading={t("index.title")} />
    </div>
  );
}
