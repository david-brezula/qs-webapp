import { getTranslations } from "next-intl/server";
import { renderOgImage } from "@/lib/og";

export const alt = "Quantum Sphere";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.hero" });
  return renderOgImage({ eyebrow: t("kicker"), title: t("title") });
}
