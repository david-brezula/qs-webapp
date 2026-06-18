// Safe custom-event helper. Lazily imports posthog-js (the same singleton the
// PostHogProvider initialises) only when an event is actually tracked, so the
// library never ships in the first-load bundle. No-op unless PostHog is
// configured; if consent was never granted the singleton has no token and
// capture() sends nothing. Never throws — analytics must never break the UI.
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  void import("posthog-js")
    .then(({ default: posthog }) => {
      try {
        posthog.capture(event, props);
      } catch {
        // ignore — analytics must never break the UI
      }
    })
    .catch(() => {
      // ignore — failing to load analytics must never break the UI
    });
}
