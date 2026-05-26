"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useConsentState } from "@/lib/hooks/useConsentState";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

// True once posthog.init() has been called. Never reset to false — posthog-js
// does not support re-initialization; opt_in/opt_out toggling is used instead.
let initialized = false;
function ensureInit() {
  if (initialized || !KEY || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

function shutdown() {
  if (!initialized) return;
  posthog.opt_out_capturing();
  // posthog-js has no full teardown — opt_out_capturing stops new events and
  // marks internal consent as DENIED, but does not remove existing ph_*
  // cookies or localStorage. reset() handles the synchronous cleanup of
  // stored tracking data. Note: reset() also internally resets posthog's
  // consent status to PENDING, which is fine — useConsentState reads from
  // the qs_consent cookie (set by the server action), not posthog internals.
  try {
    posthog.reset();
  } catch {
    /* no-op on SSR or stale state */
  }
}

export function PostHogProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { state: consent } = useConsentState();

  useEffect(() => {
    if (consent === "granted") {
      ensureInit();
      if (initialized) posthog.opt_in_capturing();
    } else if (consent === "denied" && initialized) {
      shutdown();
    }
  }, [consent]);

  useEffect(() => {
    if (!KEY || !initialized || consent !== "granted") return;
    posthog.capture("$pageview", { locale });
  }, [pathname, locale, consent]);

  return <>{children}</>;
}
