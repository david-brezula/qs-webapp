"use client";

import { useEffect, useState } from "react";
import { readConsentFromDocument, CONSENT_EVENT, type ConsentState } from "@/lib/consent";

// Reads qs_consent cookie and stays in sync via the CONSENT_EVENT same-tab
// notification. `hydrated` flips true after the first client-side read — gates
// conditional rendering to avoid SSR/CSR mismatch. The post-mount flip is
// intentional: it must initialise to `false` on both SSR and first client
// render so they agree; only the second client render shows the consent UI.
export function useConsentState() {
  const [state, setState] = useState<ConsentState>("unset");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount hydration flip; see comment above
    setState(readConsentFromDocument());
    setHydrated(true);
    const onChange = () => setState(readConsentFromDocument());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return { state, setState, hydrated };
}
