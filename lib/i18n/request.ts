import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { resolveLocale } from "./config";

export default getRequestConfig(async () => {
  const session = await auth();
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;

  const locale = resolveLocale({
    cookieLocale,
    sessionLanguage: session?.user?.language,
  });

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
