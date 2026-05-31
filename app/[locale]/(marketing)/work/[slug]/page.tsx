import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ProjectCaseStudy } from "@/components/marketing/ProjectCaseStudy";
import { getProjectBySlug, PROJECT_SLUGS } from "@/lib/projects";
import { PROJECT_IMAGE } from "@/lib/marketingImages";
import { alternatesForProject } from "@/lib/seo";

export function generateStaticParams() {
  return PROJECT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  const t = await getTranslations({
    locale,
    namespace: `projects.items.${project.key}`,
  });
  const image = PROJECT_IMAGE[project.key];
  return {
    title: t("title"),
    description: t("summary"),
    alternates: alternatesForProject(slug, locale),
    ...(image ? { openGraph: { images: [image] } } : {}),
  };
}

export default async function ProjectCaseStudyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!getProjectBySlug(slug)) notFound();
  return <ProjectCaseStudy slug={slug} />;
}
