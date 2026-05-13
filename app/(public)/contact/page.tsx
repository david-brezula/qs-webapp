"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import {
  CONTACT_SCOPE_OPTIONS,
  US_STATES,
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
      state: String(fd.get("state") ?? ""),
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
    <>
      <Nav />
      <main className="py-16 md:py-24">
        <Container className="max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-ink hover:text-navy mb-8"
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>

          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/60 mb-3">
            Request capacity
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-navy">
            Send us a project.
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-ink max-w-2xl leading-relaxed">
            Share the basics and we&apos;ll come back with crew availability and
            a working estimate within one business day.
          </p>

          <form
            onSubmit={onSubmit}
            noValidate
            className="mt-12 grid gap-6 md:grid-cols-2"
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
              label="System size (MW)"
              name="sizeMW"
              type="number"
              step="0.01"
              error={errors.sizeMW}
            />
            <Select
              label="Project state"
              name="state"
              options={US_STATES}
              error={errors.state}
            />
            <Field
              label="Target start date"
              name="startDate"
              type="date"
              error={errors.startDate}
            />

            <fieldset className="md:col-span-2">
              <legend className="text-sm font-semibold text-navy mb-3">
                Scope needed
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {CONTACT_SCOPE_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-sm text-slate-ink border border-border-soft rounded-md px-3 py-2 bg-surface cursor-pointer hover:border-navy/40"
                  >
                    <input
                      type="checkbox"
                      name="scope"
                      value={opt}
                      className="accent-[var(--color-accent)]"
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {errors.scope && (
                <p className="mt-2 text-xs text-red-600" role="alert">
                  {errors.scope}
                </p>
              )}
            </fieldset>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-navy block mb-2">
                Notes <span className="text-muted font-normal">(optional)</span>
              </label>
              <textarea
                name="notes"
                rows={5}
                className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm text-slate-ink focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
              />
              {errors.notes && (
                <p className="mt-2 text-xs text-red-600" role="alert">
                  {errors.notes}
                </p>
              )}
            </div>

            {errors._form && (
              <p
                id="form-error"
                role="alert"
                aria-live="polite"
                className="md:col-span-2 text-sm text-red-600"
              >
                {errors._form}
              </p>
            )}

            <div className="md:col-span-2 pt-2">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Sending..." : "Send RFP"}
              </Button>
            </div>
          </form>
        </Container>
      </main>
      <Footer />
    </>
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
      <label htmlFor={name} className="text-sm font-semibold text-navy block mb-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm text-slate-ink focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
      />
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-600" role="alert">
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
      <label htmlFor={name} className="text-sm font-semibold text-navy block mb-2">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue=""
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm text-slate-ink focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
      >
        <option value="" disabled>
          Select...
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
