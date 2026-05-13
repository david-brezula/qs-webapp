import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "./config";

export default getRequestConfig(async () => {
  const session = await auth();
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;

  let locale: Locale = DEFAULT_LOCALE;
  if (session?.user?.language) {
    locale = session.user.language.toLowerCase() as Locale;
  } else if (cookieLocale) {
    locale = normalizeLocale(cookieLocale);
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
