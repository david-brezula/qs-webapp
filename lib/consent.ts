// Client-side read of the consent cookie. The cookie is named `qs_consent`
// with values "granted" | "denied". Absence = unset (banner shows).
export type ConsentState = "granted" | "denied" | "unset";

export const CONSENT_COOKIE = "qs_consent";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 6 months

export function readConsentFromDocument(): ConsentState {
  if (typeof document === "undefined") return "unset";
  const m = document.cookie.match(/(?:^|;\s*)qs_consent=([^;]+)/);
  if (!m) return "unset";
  return m[1] === "granted" ? "granted" : m[1] === "denied" ? "denied" : "unset";
}

// Fires whenever the document.cookie value for qs_consent changes.
export const CONSENT_EVENT = "qs:consent-changed";
