"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import {
  CONTACT_SCOPE_OPTIONS,
  EU_COUNTRIES,
} from "@/lib/content";
import {
  contactSchema,
  PROJECT_TYPES,
  type ContactPayload,
} from "@/lib/contact-schema";

type Errors = Partial<Record<keyof ContactPayload, string>> & {
  _form?: string;
};

export default function ContactPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      company: String(fd.get("company") ?? ""),
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      projectType: String(fd.get("projectType") ?? ""),
      sizeMW: String(fd.get("sizeMW") ?? ""),
      country: String(fd.get("country") ?? ""),
      startDate: String(fd.get("startDate") ?? ""),
      scope: fd.getAll("scope").map(String),
      notes: String(fd.get("notes") ?? ""),
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
        setErrors({ _form: "Submission failed. Try again." });
        setSubmitting(false);
        return;
      }
      router.push("/contact/thanks");
    } catch {
      setErrors({ _form: "Network error. Try again." });
      setSubmitting(false);
    }
  }

  return (
    <div className="py-16 md:py-24">
      <Container className="max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[0.8125rem] text-[var(--color-slate)] hover:text-[var(--color-ink)] mb-10 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back to home
          </Link>

          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-10 bg-[var(--color-rule)]" />
            <span className="eyebrow text-[var(--color-ink)]">
              Request crew capacity
            </span>
          </div>

          <h1
            className="font-display text-[2.5rem] md:text-[4rem] leading-[1.02] tracking-[-0.03em] text-[var(--color-ink)]"
            style={{ fontWeight: 350 }}
          >
            Send us a project.
          </h1>
          <p className="mt-5 text-[1rem] md:text-[1.0625rem] text-[var(--color-slate)] max-w-2xl leading-[1.65]">
            Share the basics — tender pack, single‑line or rough scope. We come
            back within one business day with crew availability and an
            indicative price.
          </p>

          <form
            onSubmit={onSubmit}
            noValidate
            className="mt-14 grid gap-6 md:grid-cols-2"
            aria-describedby={errors._form ? "form-error" : undefined}
          >
            <Field label="Company" name="company" error={errors.company} />
            <Field label="Your name" name="name" error={errors.name} />
            <Field
              label="Email"
              name="email"
              type="email"
              error={errors.email}
            />
            <Select
              label="Project type"
              name="projectType"
              options={PROJECT_TYPES}
              error={errors.projectType}
            />
            <Field
              label="System size (MWp)"
              name="sizeMW"
              type="number"
              step="0.01"
              error={errors.sizeMW}
            />
            <Select
              label="Project country"
              name="country"
              options={EU_COUNTRIES}
              error={errors.country}
            />
            <Field
              label="Target start date"
              name="startDate"
              type="date"
              error={errors.startDate}
            />

            <fieldset className="md:col-span-2 mt-2">
              <legend className="eyebrow text-[var(--color-ink)] mb-4">
                Scope needed
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {CONTACT_SCOPE_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-3 text-[0.875rem] text-[var(--color-ink)] border border-[var(--color-rule)] rounded-[var(--radius-card)] px-4 py-3 bg-[var(--color-canvas)] cursor-pointer hover:border-[var(--color-ink)]/40 transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="scope"
                      value={opt}
                      className="accent-[var(--color-ember)]"
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {errors.scope && (
                <p className="mt-2 text-xs text-[var(--color-ember-2)]" role="alert">
                  {errors.scope}
                </p>
              )}
            </fieldset>

            <div className="md:col-span-2">
              <label className="eyebrow text-[var(--color-ink)] block mb-3">
                Notes <span className="text-[var(--color-mist)] font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                name="notes"
                rows={5}
                className="w-full rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-canvas)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]/30"
              />
              {errors.notes && (
                <p className="mt-2 text-xs text-[var(--color-ember-2)]" role="alert">
                  {errors.notes}
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

            <div className="md:col-span-2 pt-4">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Sending…" : "Send request"}
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
  step,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  error?: string;
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
        step={step}
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

function Select({
  label,
  name,
  options,
  error,
}: {
  label: string;
  name: string;
  options: readonly string[];
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="eyebrow text-[var(--color-ink)] block mb-3">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue=""
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="w-full rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-canvas)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]/30"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-xs text-[var(--color-ember-2)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
