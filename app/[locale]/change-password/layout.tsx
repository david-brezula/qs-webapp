import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";

export default async function ChangePasswordLayout({
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
