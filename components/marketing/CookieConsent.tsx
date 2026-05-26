"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { buttonClass } from "@/components/ui/Button";
import { readConsentFromDocument, CONSENT_EVENT, type ConsentState } from "@/lib/consent";
import { setConsent } from "@/lib/actions/consent";

export function CookieConsent() {
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

  if (!hydrated || state !== "unset") return null;

  const decide = (value: "granted" | "denied") => {
    startTransition(async () => {
      await setConsent(value);
      setState(value);
      window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
    });
  };

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
      className="fixed inset-x-3 bottom-3 z-50 md:inset-x-auto md:right-6 md:bottom-6 md:max-w-md rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] shadow-[0_18px_44px_-22px_rgba(15,22,33,0.35)] p-6"
    >
      <h2
        id="consent-title"
        className="font-display text-[1.125rem] tracking-[-0.01em] text-[var(--color-ink)]"
        style={{ fontWeight: 700 }}
      >
        {t("title")}
      </h2>
      <p id="consent-body" className="mt-3 text-[0.875rem] text-[var(--color-slate)] leading-[1.55]">
        {t("body")}{" "}
        <Link href="/cookies" className="underline hover:text-[var(--color-ink)]">
          {t("learnMore")}
        </Link>
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button type="button" className={buttonClass("secondary")} onClick={() => decide("denied")}>
          {t("decline")}
        </button>
        <button type="button" className={buttonClass("primary")} onClick={() => decide("granted")}>
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
