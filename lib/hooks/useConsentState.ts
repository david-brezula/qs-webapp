"use client";

import { useEffect, useState } from "react";
import { readConsentFromDocument, CONSENT_EVENT, type ConsentState } from "@/lib/consent";

// Reads qs_consent cookie and stays in sync via the CONSENT_EVENT same-tab notification.
// `hydrated` flips true after the first client-side read — gates conditional rendering
// to avoid SSR/CSR mismatch.
export function useConsentState() {
  const [state, setState] = useState<ConsentState>("unset");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readConsentFromDocument());
    setHydrated(true);
    const onChange = () => setState(readConsentFromDocument());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return { state, setState, hydrated };
}
