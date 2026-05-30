import type { Metadata } from "next";
import { Stack_Sans_Text } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { CookieConsent } from "@/components/marketing/CookieConsent";
import { SITE_URL } from "@/lib/seo";
import "../globals.css";

// Single distinctive typeface across the whole site. Stack Sans Text is a
// variable "expressive business" sans (wght 200–700); headings get weight +
// tight tracking (see .font-display in globals.css) for hierarchy.
const stackSans = Stack_Sans_Text({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) notFound();

  // Enable static rendering for this locale.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning className={stackSans.variable}>
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <PostHogProvider locale={locale}>{children}</PostHogProvider>
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
