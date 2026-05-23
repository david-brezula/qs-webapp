"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

// Analytics is opt-in: it only initializes when NEXT_PUBLIC_POSTHOG_KEY is set
// (add it in the deploy env). Without the key everything is a no-op.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let initialized = false;
function ensureInit() {
  if (initialized || !KEY || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false, // App Router: capture manually on route change
    capture_pageleave: true,
  });
  initialized = true;
}

export function PostHogProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    ensureInit();
  }, []);

  useEffect(() => {
    if (!KEY || !initialized) return;
    posthog.capture("$pageview", { locale });
  }, [pathname, locale]);

  return <>{children}</>;
}
