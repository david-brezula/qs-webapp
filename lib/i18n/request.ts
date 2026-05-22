import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// URL-prefix routing: the active locale comes from the `[locale]` segment
// (provided by next-intl's proxy middleware via `requestLocale`). The login
// flow seeds the initial locale from the user's account language elsewhere
// (see lib/i18n/config.ts + the login redirect).
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    requested && (routing.locales as readonly string[]).includes(requested)
      ? requested
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
