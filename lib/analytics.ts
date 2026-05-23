import posthog from "posthog-js";

// Safe custom-event helper. No-op unless PostHog is configured + loaded.
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(event, props);
  } catch {
    // ignore — analytics must never break the UI
  }
}
