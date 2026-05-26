"use client";

import { useEffect, useRef, useState } from "react";
import { readConsentFromDocument, CONSENT_EVENT, type ConsentState } from "@/lib/consent";

// Reads qs_consent cookie and stays in sync via the CONSENT_EVENT same-tab notification.
// `hydrated` flips true after the first client-side read — gates conditional rendering
// to avoid SSR/CSR mismatch.
//
// Note: initial state is set via a lazy initializer on first render (client-only,
// guarded by `typeof window`) rather than inside a useEffect body, which avoids the
// react-hooks/set-state-in-effect lint rule and eliminates one extra render cycle.
export function useConsentState() {
  const [state, setState] = useState<ConsentState>(() =>
    typeof window !== "undefined" ? readConsentFromDocument() : "unset"
  );
  const [hydrated] = useState(() => typeof window !== "undefined");
  // Track whether the event listener is already registered (StrictMode double-invoke safe)
  const listenerRef = useRef(false);

  useEffect(() => {
    if (listenerRef.current) return;
    listenerRef.current = true;

    const onChange = () => setState(readConsentFromDocument());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => {
      listenerRef.current = false;
      window.removeEventListener(CONSENT_EVENT, onChange);
    };
  }, []);

  return { state, setState, hydrated };
}
