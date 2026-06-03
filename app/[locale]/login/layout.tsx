import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";

// The login page reads the `from` search param during render (to theme the
// work-portal vs client-portal variant), so opt the route out of static
// prerender.
export const dynamic = "force-dynamic";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  const locale = await getLocale();
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
