"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useConsentState } from "@/lib/hooks/useConsentState";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

// posthog-js (~60KB gzip) is loaded lazily via dynamic import the first time
// consent is granted, so it never ships in the marketing/portal first-load
// bundle. `ph` holds the singleton once loaded + initialised; `initPromise`
// de-dupes concurrent init attempts. posthog-js does not support
// re-initialisation, so the instance lives for the page lifetime —
// opt_in/opt_out toggling is used instead of teardown.
type PostHogClient = (typeof import("posthog-js"))["default"];
let ph: PostHogClient | null = null;
let initPromise: Promise<PostHogClient | null> | null = null;

function ensureInit(): Promise<PostHogClient | null> {
  if (ph) return Promise.resolve(ph);
  if (!KEY || typeof window === "undefined") return Promise.resolve(null);
  initPromise ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
    });
    ph = posthog;
    return posthog;
  });
  return initPromise;
}

function shutdown() {
  if (!ph) return;
  ph.opt_out_capturing();
  // posthog-js has no full teardown — opt_out_capturing stops new events and
  // marks internal consent as DENIED, but does not remove existing ph_*
  // cookies or localStorage. reset() handles the synchronous cleanup of
  // stored tracking data. Note: reset() also internally resets posthog's
  // consent status to PENDING, which is fine — useConsentState reads from
  // the qs_consent cookie (set by the server action), not posthog internals.
  try {
    ph.reset();
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
  // Flips true once posthog-js has finished loading + initialising. Because the
  // load is now async, this re-triggers the pageview effect below so the first
  // pageview still fires once the library is ready.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (consent === "granted") {
      ensureInit().then((p) => {
        if (!p) return;
        p.opt_in_capturing();
        setReady(true);
      });
    } else if (consent === "denied") {
      shutdown();
    }
  }, [consent]);

  useEffect(() => {
    if (!KEY || consent !== "granted" || !ph) return;
    ph.capture("$pageview", { locale });
  }, [pathname, locale, consent, ready]);

  return <>{children}</>;
}
