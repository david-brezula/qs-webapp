"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { Button, buttonClass } from "@/components/ui/Button";
import { SERVICES } from "@/lib/services";
import { contactSchema, type ContactPayload } from "@/lib/contact-schema";
import { track } from "@/lib/analytics";

type Errors = Partial<Record<keyof ContactPayload, string>> & { _form?: string };

export function ContactForm() {
  const t = useTranslations("contact");
  const tf = useTranslations("contact.form");
  const tNav = useTranslations("nav");
  const tServices = useTranslations("services");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      company: String(fd.get("company") ?? ""),
      serviceType: String(fd.get("serviceType") ?? ""),
      message: String(fd.get("message") ?? ""),
      gdprConsent: fd.get("gdprConsent") === "on",
      _hp: String(fd.get("_hp") ?? ""),
    };

    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ContactPayload | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        setErrors({ _form: tf("error") });
        setSubmitting(false);
        return;
      }
      track("contact_submitted", { serviceType: parsed.data.serviceType });
      setDone(true);
    } catch {
      setErrors({ _form: tf("error") });
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="py-24 md:py-32">
        <Container className="max-w-2xl text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-fjord)] text-[var(--color-fjord)] mb-7">
            <CheckCircle2 size={28} strokeWidth={1.5} />
          </div>
          <h1
            className="font-display text-[1.875rem] md:text-[2.75rem] tracking-[-0.03em] text-[var(--color-ink)] leading-[1.05]"
            style={{ fontWeight: 700 }}
          >
            {tf("success")}
          </h1>
          <div className="mt-10">
            <Link href="/" className={buttonClass("secondary")}>
              {tNav("home")}
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-16 md:py-24">
      <Container className="max-w-3xl">
        <div className="flex items-center gap-3 mb-5">
          <span className="h-px w-10 bg-[var(--color-rule)]" />
          <span className="eyebrow text-[var(--color-fjord)]">{t("subtitle")}</span>
        </div>
        <h1
          className="font-display text-[2.5rem] md:text-[4rem] leading-[1.02] tracking-[-0.03em] text-[var(--color-ink)]"
          style={{ fontWeight: 700 }}
        >
          {t("title")}
        </h1>

        <form
          onSubmit={onSubmit}
          noValidate
          className="mt-12 grid gap-6 md:grid-cols-2"
          aria-describedby={errors._form ? "form-error" : undefined}
        >
          <Field label={tf("name")} name="name" error={errors.name} required />
          <Field label={tf("email")} name="email" type="email" error={errors.email} required />
          <Field label={tf("phone")} name="phone" type="tel" error={errors.phone} />
          <Field label={tf("company")} name="company" error={errors.company} />

          <div className="md:col-span-2">
            <label htmlFor="serviceType" className="eyebrow text-[var(--color-ink)] block mb-3">
              {tf("serviceType")}
            </label>
            <select
              id="serviceType"
              name="serviceType"
              defaultValue=""
              aria-invalid={Boolean(errors.serviceType)}
              className="w-full rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-canvas)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]/30"
            >
              <option value="" disabled>
                {tf("serviceSelect")}
              </option>
              {SERVICES.map(({ slug }) => (
                <option key={slug} value={slug}>
                  {tServices(`${slug}.name`)}
                </option>
              ))}
              <option value="other">{tf("serviceOther")}</option>
            </select>
            {errors.serviceType && (
              <p className="mt-1.5 text-xs text-[var(--color-ember-2)]" role="alert">
                {errors.serviceType}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="message" className="eyebrow text-[var(--color-ink)] block mb-3">
              {tf("message")}
            </label>
            <textarea
              id="message"
              name="message"
              rows={6}
              aria-invalid={Boolean(errors.message)}
              className="w-full rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-canvas)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]/30"
            />
            {errors.message && (
              <p className="mt-1.5 text-xs text-[var(--color-ember-2)]" role="alert">
                {errors.message}
              </p>
            )}
          </div>

          {errors._form && (
            <p
              id="form-error"
              role="alert"
              aria-live="polite"
              className="md:col-span-2 text-sm text-[var(--color-ember-2)]"
            >
              {errors._form}
            </p>
          )}

          {/* Honeypot — keep label/field out of the visual flow; bots fill it, humans don't. */}
          <div
            aria-hidden="true"
            style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
            className="md:col-span-2"
          >
            <label htmlFor="_hp">Leave this field empty</label>
            <input id="_hp" name="_hp" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-start gap-3 cursor-pointer text-[0.875rem] text-[var(--color-ink-2)] leading-[1.5]">
              <input
                id="gdprConsent"
                type="checkbox"
                name="gdprConsent"
                required
                aria-invalid={Boolean(errors.gdprConsent)}
                aria-describedby={errors.gdprConsent ? "gdprConsent-error" : undefined}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--color-rule)] text-[var(--color-fjord)] focus:ring-[var(--color-ink)]/30"
              />
              <span>
                {tf("gdprLabel").replace(tf("gdprLinkText"), "##LINK##").split("##LINK##").map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <Link href="/privacy" className="underline hover:text-[var(--color-ink)]">
                        {tf("gdprLinkText")}
                      </Link>
                    )}
                  </span>
                ))}
              </span>
            </label>
            {errors.gdprConsent && (
              <p
                id="gdprConsent-error"
                className="mt-1.5 text-xs text-[var(--color-ember-2)]"
                role="alert"
              >
                {tf("gdprRequired")}
              </p>
            )}
          </div>

          <div className="md:col-span-2 pt-2">
            <Button type="submit" variant="primary" disabled={submitting}>
              {tf("submit")}
              <ArrowRight size={15} strokeWidth={1.5} />
            </Button>
          </div>
        </form>
      </Container>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="eyebrow text-[var(--color-ink)] block mb-3">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="w-full rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-canvas)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]/30"
      />
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-xs text-[var(--color-ember-2)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
