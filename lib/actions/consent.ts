"use server";

import { cookies } from "next/headers";
import { CONSENT_COOKIE, CONSENT_MAX_AGE, type ConsentState } from "@/lib/consent";

export async function setConsent(value: Exclude<ConsentState, "unset">) {
  const store = await cookies();
  store.set(CONSENT_COOKIE, value, {
    maxAge: CONSENT_MAX_AGE,
    path: "/",
    sameSite: "lax",
    // Not HttpOnly — we need to read it client-side to gate PostHog init.
  });
}

export async function revokeConsent() {
  const store = await cookies();
  store.delete(CONSENT_COOKIE);
}
