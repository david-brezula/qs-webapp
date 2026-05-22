import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

// Catch-all so unmatched paths under [locale] trigger the localized not-found
// WITHIN the [locale] layout (which provides the next-intl context). Without
// this, Next renders the 404 outside the provider and translations break.
export default async function CatchAllNotFound({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  notFound();
}
