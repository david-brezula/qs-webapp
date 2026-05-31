import { setRequestLocale, getTranslations } from "next-intl/server";
import { ProjectsIndex } from "@/components/marketing/ProjectsIndex";
import { alternatesForPathname } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projects.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternatesForPathname("/work", locale),
  };
}

export default async function WorkIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProjectsIndex />;
}
