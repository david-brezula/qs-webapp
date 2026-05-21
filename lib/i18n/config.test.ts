import { describe, expect, it } from "vitest";
import { resolveLocale } from "./config";

describe("resolveLocale", () => {
  it("prefers the locale cookie (the user's explicit toggle) over the account language", () => {
    // The bug: a logged-in worker defaults to EN in the DB. Clicking "SK"
    // sets the locale cookie, but the account language must not shadow it.
    expect(resolveLocale({ cookieLocale: "sk", sessionLanguage: "EN" })).toBe("sk");
  });

  it("falls back to the account language when no cookie is set", () => {
    expect(resolveLocale({ cookieLocale: undefined, sessionLanguage: "SK" })).toBe("sk");
  });

  it("honors a cookie that switches back to English over an SK account", () => {
    expect(resolveLocale({ cookieLocale: "en", sessionLanguage: "SK" })).toBe("en");
  });

  it("defaults to English when neither cookie nor account language is present", () => {
    expect(resolveLocale({ cookieLocale: null, sessionLanguage: null })).toBe("en");
  });

  it("normalizes region-tagged cookie values", () => {
    expect(resolveLocale({ cookieLocale: "sk-SK", sessionLanguage: "EN" })).toBe("sk");
  });
});
