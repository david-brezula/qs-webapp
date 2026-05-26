"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/Button";
import { readConsentFromDocument, CONSENT_EVENT, type ConsentState } from "@/lib/consent";
import { setConsent, revokeConsent } from "@/lib/actions/consent";

export function ConsentResetButton({ label }: { label: string }) {
  const t = useTranslations("consent");
  const [state, setState] = useState<ConsentState>("unset");
  const [hydrated, setHydrated] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setState(readConsentFromDocument());
    setHydrated(true);
    const onChange = () => setState(readConsentFromDocument());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!hydrated) return null;

  const flip = () => {
    startTransition(async () => {
      if (state === "granted") {
        await revokeConsent();
      } else {
        await setConsent("granted");
      }
      setState(readConsentFromDocument());
      window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
    });
  };

  const status =
    state === "granted" ? t("currentGranted") : state === "denied" ? t("currentDenied") : t("currentUnset");

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-canvas)] p-6">
      <div className="eyebrow text-[var(--color-fjord)] mb-3">{t("manageTitle")}</div>
      <p className="text-[0.875rem] text-[var(--color-slate)] mb-4">{status}</p>
      <button type="button" className={buttonClass("secondary")} onClick={flip}>
        {state === "granted" ? t("revoke") : t("regrant")}
      </button>
      <span className="sr-only">{label}</span>
    </div>
  );
}
