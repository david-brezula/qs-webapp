"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/Button";
import { CONSENT_EVENT } from "@/lib/consent";
import { setConsent, revokeConsent } from "@/lib/actions/consent";
import { useConsentState } from "@/lib/hooks/useConsentState";

export function ConsentResetButton({ label }: { label: string }) {
  const t = useTranslations("consent");
  const { state, setState, hydrated } = useConsentState();
  const [, startTransition] = useTransition();

  if (!hydrated) return null;

  const flip = () => {
    startTransition(async () => {
      if (state === "granted") {
        await revokeConsent();
        setState("unset");
      } else {
        await setConsent("granted");
        setState("granted");
      }
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
