# Inquiries (Worker Applications + Customer Leads) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/careers` worker-application form and ADMIN-only portal views for both worker applications and customer leads, reusing the existing contact-form pipeline.

**Architecture:** Public client forms validate with zod and POST to an `/api/*` route that rate-limits, screens a honeypot, persists to Postgres via Prisma, and sends a best-effort email notification (exact pattern of the existing `/contact` flow). Staff review submissions through new portal pages gated by `requireAdmin()`, listing rows via the shared `DataTable` and updating a status enum through a server action.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, Prisma 7 (+ `@prisma/adapter-pg`, Postgres), zod 4, next-intl (sk/en/de/fr/sv), nodemailer, vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-05-30-inquiries-worker-customer-design.md`

---

## File Structure

**Phase 1 — Worker careers form (public)**
- Create `vitest.config.ts` — vitest config resolving the `@/` path alias (first test infra).
- Create `lib/careers-schema.ts` — zod schema + `CareersPayload` type.
- Create `lib/careers-schema.test.ts` — unit tests for the schema.
- Modify `prisma/schema.prisma` — add `ApplicationStatus` enum + `WorkerApplication` model.
- Modify `lib/mailer.ts` — add `sendWorkerApplicationNotification`.
- Create `app/api/careers/route.ts` — POST handler.
- Create `app/[locale]/(marketing)/careers/CareersForm.tsx` — client form.
- Create `app/[locale]/(marketing)/careers/page.tsx` — page + metadata.
- Modify `lib/i18n/routing.ts` — add `/careers` localized pathnames.
- Modify `components/marketing/MarketingHeader.tsx` — add Careers nav link (desktop + mobile).
- Modify `components/marketing/MarketingFooter.tsx` — add Careers link in the Company column.
- Modify `messages/{sk,en,de,fr,sv}.json` — add `careers` namespace + `nav.careers`.

**Phase 2 — Portal admin**
- Modify `prisma/schema.prisma` — add `InquiryStatus` enum + `ContactSubmission.status`.
- Modify `lib/portal-nav.ts` — add `/applications` + `/inquiries` ADMIN nav items; widen `labelKey` union.
- Create `app/[locale]/(portal)/applications/page.tsx` — applications list.
- Create `app/[locale]/(portal)/applications/[id]/page.tsx` — application detail + status action.
- Create `app/[locale]/(portal)/inquiries/page.tsx` — customer leads list.
- Create `app/[locale]/(portal)/inquiries/[id]/page.tsx` — lead detail + status action.
- Modify `lib/i18n/routing.ts` — add portal `/applications` + `/inquiries` pathnames.
- Modify `messages/{sk,en,de,fr,sv}.json` — add `applications` + `inquiries` namespaces + portal `nav` keys.

---

# PHASE 1 — Worker careers form (public)

### Task 1: Vitest config + careers zod schema (TDD)

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/careers-schema.ts`
- Test: `lib/careers-schema.test.ts`

- [ ] **Step 1: Add vitest config so tests resolve the `@/` alias**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
```

- [ ] **Step 2: Write the failing test**

Create `lib/careers-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { careersSchema } from "@/lib/careers-schema";

const valid = {
  name: "Jan Novák",
  email: "jan@example.com",
  trades: ["solar"],
  gdprConsent: true,
};

describe("careersSchema", () => {
  it("accepts a minimal valid payload", () => {
    expect(careersSchema.safeParse(valid).success).toBe(true);
  });

  it("coerces experienceYears from a string", () => {
    const r = careersSchema.safeParse({ ...valid, experienceYears: "5" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.experienceYears).toBe(5);
  });

  it("requires at least one trade", () => {
    expect(careersSchema.safeParse({ ...valid, trades: [] }).success).toBe(false);
  });

  it("rejects an unknown trade", () => {
    expect(careersSchema.safeParse({ ...valid, trades: ["plumbing"] }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(careersSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });

  it("rejects an invalid cvUrl but allows empty string", () => {
    expect(careersSchema.safeParse({ ...valid, cvUrl: "not-a-url" }).success).toBe(false);
    expect(careersSchema.safeParse({ ...valid, cvUrl: "" }).success).toBe(true);
  });

  it("requires gdpr consent", () => {
    expect(careersSchema.safeParse({ ...valid, gdprConsent: false }).success).toBe(false);
  });

  it("fails when the honeypot is filled", () => {
    expect(careersSchema.safeParse({ ...valid, _hp: "bot" }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run lib/careers-schema.test.ts`
Expected: FAIL — cannot resolve `@/lib/careers-schema` (module does not exist yet).

- [ ] **Step 4: Implement the schema**

Create `lib/careers-schema.ts`:

```ts
import { z } from "zod";
import { SERVICE_TYPES } from "@/lib/contact-schema";

// Reuses the trade slugs from the contact schema (solar/electrical/drywall/
// masonry/roofing/other) so the form renders localized labels from
// `services.<slug>.name`.
export const careersSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(40).optional(),
  trades: z
    .array(z.enum(SERVICE_TYPES))
    .min(1, "Select at least one trade")
    .max(SERVICE_TYPES.length),
  experienceYears: z.coerce.number().int().min(0).max(70).optional(),
  location: z.string().trim().max(200).optional(),
  willingToTravel: z.boolean().optional().default(false),
  availableFrom: z.string().trim().max(100).optional(),
  languages: z.string().trim().max(200).optional(),
  drivingLicence: z.boolean().optional().default(false),
  cvUrl: z.union([z.string().trim().url("Enter a valid URL"), z.literal("")]).optional(),
  message: z.string().trim().max(4000).optional(),
  gdprConsent: z.literal(true, { message: "Consent required" }),
  // Honeypot — humans never see/fill it; must be empty or absent.
  _hp: z.string().max(0).optional(),
});

export type CareersPayload = z.infer<typeof careersSchema>;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/careers-schema.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts lib/careers-schema.ts lib/careers-schema.test.ts
git commit -m "feat(careers): add worker application zod schema + tests"
```

---

### Task 2: WorkerApplication Prisma model + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the enum + model**

Append to `prisma/schema.prisma` (after the `ContactSubmission` model). Add the enum near the other enums (top of file) and the model at the end:

Enum (add with the other `enum` blocks):
```prisma
enum ApplicationStatus {
  NEW
  REVIEWING
  CONTACTED
  REJECTED
  HIRED
}
```

Model (append at end of file):
```prisma
model WorkerApplication {
  id              String            @id @default(cuid())
  name            String
  email           String
  phone           String?
  trades          String[]
  experienceYears Int?
  location        String?
  willingToTravel Boolean           @default(false)
  availableFrom   String?
  languages       String?
  drivingLicence  Boolean           @default(false)
  cvUrl           String?
  message         String            @default("")
  status          ApplicationStatus @default(NEW)
  createdAt       DateTime          @default(now())

  @@index([status])
  @@index([createdAt])
}
```

- [ ] **Step 2: Create and apply the migration**

Run: `npx prisma migrate dev --name add_worker_application`
Expected: a new folder under `prisma/migrations/` and "Your database is now in sync with your schema." The Prisma client regenerates (the project's `postinstall` runs `prisma generate`; the migrate command also regenerates).

- [ ] **Step 3: Verify the client typings**

Run: `npx tsc --noEmit`
Expected: exit 0 (the generated client now exports `WorkerApplication` + `ApplicationStatus`).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(careers): add WorkerApplication model + migration"
```

---

### Task 3: Email notification for applications

**Files:**
- Modify: `lib/mailer.ts`

- [ ] **Step 1: Add the notification function**

Append to `lib/mailer.ts` (it already imports `nodemailer`):

```ts
export async function sendWorkerApplicationNotification(data: {
  name: string;
  email: string;
  phone?: string | null;
  trades: string[];
  experienceYears?: number | null;
  location?: string | null;
  willingToTravel?: boolean;
  availableFrom?: string | null;
  languages?: string | null;
  drivingLicence?: boolean;
  cvUrl?: string | null;
  message?: string | null;
}) {
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  if (!to || !process.env.SMTP_HOST) return; // skip if not configured

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    replyTo: data.email,
    subject: `New job application — ${data.name} · ${data.trades.join(", ")}`,
    text: [
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      data.phone ? `Phone: ${data.phone}` : null,
      `Trades: ${data.trades.join(", ")}`,
      data.experienceYears != null ? `Experience: ${data.experienceYears} years` : null,
      data.location ? `Location: ${data.location}` : null,
      `Willing to travel: ${data.willingToTravel ? "yes" : "no"}`,
      data.availableFrom ? `Available from: ${data.availableFrom}` : null,
      data.languages ? `Languages: ${data.languages}` : null,
      `Driving licence: ${data.drivingLicence ? "yes" : "no"}`,
      data.cvUrl ? `CV/portfolio: ${data.cvUrl}` : null,
      "",
      data.message || "(no message)",
    ]
      .filter((line) => line !== null)
      .join("\n"),
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/mailer.ts
git commit -m "feat(careers): add worker application email notification"
```

---

### Task 4: API route `/api/careers`

**Files:**
- Create: `app/api/careers/route.ts`

- [ ] **Step 1: Implement the route**

Create `app/api/careers/route.ts` (mirrors `app/api/contact/route.ts`):

```ts
import { NextResponse } from "next/server";
import { careersSchema } from "@/lib/careers-schema";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendWorkerApplicationNotification } from "@/lib/mailer";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: quietly succeed without persisting.
  if (typeof body === "object" && body !== null && "_hp" in body) {
    const hp = (body as { _hp?: unknown })._hp;
    if (typeof hp === "string" && hp.length > 0) {
      return NextResponse.json({ ok: true });
    }
  }

  const parsed = careersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const d = parsed.data;
  await prisma.workerApplication.create({
    data: {
      name: d.name,
      email: d.email,
      phone: d.phone?.trim() || null,
      trades: d.trades,
      experienceYears: d.experienceYears ?? null,
      location: d.location?.trim() || null,
      willingToTravel: d.willingToTravel ?? false,
      availableFrom: d.availableFrom?.trim() || null,
      languages: d.languages?.trim() || null,
      drivingLicence: d.drivingLicence ?? false,
      cvUrl: d.cvUrl?.trim() || null,
      message: d.message?.trim() || "",
    },
  });

  await sendWorkerApplicationNotification({
    name: d.name,
    email: d.email,
    phone: d.phone,
    trades: d.trades,
    experienceYears: d.experienceYears,
    location: d.location,
    willingToTravel: d.willingToTravel,
    availableFrom: d.availableFrom,
    languages: d.languages,
    drivingLicence: d.drivingLicence,
    cvUrl: d.cvUrl,
    message: d.message,
  }).catch((err) => {
    console.error("Career application email notification failed:", err);
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Manual smoke test (dev server running on :3000)**

Run:
```bash
curl -s -X POST http://localhost:3000/api/careers -H "Content-Type: application/json" -d '{"name":"Test","email":"t@example.com","trades":["solar"],"gdprConsent":true}'
```
Expected: `{"ok":true}`. Then confirm a row exists: `npx prisma studio` → `WorkerApplication` table has the row. Also verify a filled honeypot is silently accepted without a new row:
```bash
curl -s -X POST http://localhost:3000/api/careers -H "Content-Type: application/json" -d '{"name":"Bot","email":"b@example.com","trades":["solar"],"gdprConsent":true,"_hp":"x"}'
```
Expected: `{"ok":true}` and NO new row.

- [ ] **Step 4: Commit**

```bash
git add app/api/careers/route.ts
git commit -m "feat(careers): add /api/careers submission route"
```

---

### Task 5: Careers form component

**Files:**
- Create: `app/[locale]/(marketing)/careers/CareersForm.tsx`

- [ ] **Step 1: Implement the form**

Create `app/[locale]/(marketing)/careers/CareersForm.tsx`. Mirrors `ContactForm.tsx` (same `Field`, honeypot, GDPR, success state) with trade checkboxes and the extra fields:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { Button, buttonClass } from "@/components/ui/Button";
import { SERVICES } from "@/lib/services";
import { careersSchema, type CareersPayload } from "@/lib/careers-schema";
import { track } from "@/lib/analytics";

type Errors = Partial<Record<keyof CareersPayload, string>> & { _form?: string };

export function CareersForm() {
  const t = useTranslations("careers");
  const tf = useTranslations("careers.form");
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
    const expRaw = String(fd.get("experienceYears") ?? "").trim();
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      trades: fd.getAll("trades").map(String),
      experienceYears: expRaw === "" ? undefined : expRaw,
      location: String(fd.get("location") ?? ""),
      willingToTravel: fd.get("willingToTravel") === "on",
      availableFrom: String(fd.get("availableFrom") ?? ""),
      languages: String(fd.get("languages") ?? ""),
      drivingLicence: fd.get("drivingLicence") === "on",
      cvUrl: String(fd.get("cvUrl") ?? ""),
      message: String(fd.get("message") ?? ""),
      gdprConsent: fd.get("gdprConsent") === "on",
      _hp: String(fd.get("_hp") ?? ""),
    };

    const parsed = careersSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CareersPayload | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/careers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        setErrors({ _form: tf("error") });
        setSubmitting(false);
        return;
      }
      track("career_application_submitted", { trades: parsed.data.trades.join(",") });
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
            <Link href="/" className={buttonClass("secondary")}>{tNav("home")}</Link>
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
          <Field label={tf("location")} name="location" error={errors.location} />

          <fieldset className="md:col-span-2">
            <legend className="eyebrow text-[var(--color-ink)] mb-3">{tf("trades")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SERVICES.map(({ slug }) => (
                <label key={slug} className="flex items-center gap-2.5 text-[0.9375rem] text-[var(--color-ink-2)]">
                  <input type="checkbox" name="trades" value={slug}
                    className="h-4 w-4 rounded border-[var(--color-rule)] text-[var(--color-fjord)] focus:ring-[var(--color-ink)]/30" />
                  {tServices(`${slug}.name`)}
                </label>
              ))}
              <label className="flex items-center gap-2.5 text-[0.9375rem] text-[var(--color-ink-2)]">
                <input type="checkbox" name="trades" value="other"
                  className="h-4 w-4 rounded border-[var(--color-rule)] text-[var(--color-fjord)] focus:ring-[var(--color-ink)]/30" />
                {tf("tradeOther")}
              </label>
            </div>
            {errors.trades && (
              <p className="mt-1.5 text-xs text-[var(--color-ember-2)]" role="alert">{errors.trades}</p>
            )}
          </fieldset>

          <Field label={tf("experienceYears")} name="experienceYears" type="number" error={errors.experienceYears} />
          <Field label={tf("availableFrom")} name="availableFrom" error={errors.availableFrom} />
          <Field label={tf("languages")} name="languages" error={errors.languages} />
          <Field label={tf("cvUrl")} name="cvUrl" type="url" error={errors.cvUrl} />

          <label className="md:col-span-2 flex items-center gap-2.5 text-[0.9375rem] text-[var(--color-ink-2)]">
            <input type="checkbox" name="willingToTravel"
              className="h-4 w-4 rounded border-[var(--color-rule)] text-[var(--color-fjord)] focus:ring-[var(--color-ink)]/30" />
            {tf("willingToTravel")}
          </label>
          <label className="md:col-span-2 flex items-center gap-2.5 text-[0.9375rem] text-[var(--color-ink-2)] -mt-2">
            <input type="checkbox" name="drivingLicence"
              className="h-4 w-4 rounded border-[var(--color-rule)] text-[var(--color-fjord)] focus:ring-[var(--color-ink)]/30" />
            {tf("drivingLicence")}
          </label>

          <div className="md:col-span-2">
            <label htmlFor="message" className="eyebrow text-[var(--color-ink)] block mb-3">{tf("message")}</label>
            <textarea id="message" name="message" rows={5}
              className="w-full rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-canvas)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]/30" />
          </div>

          {errors._form && (
            <p id="form-error" role="alert" aria-live="polite"
              className="md:col-span-2 text-sm text-[var(--color-ember-2)]">{errors._form}</p>
          )}

          {/* Honeypot */}
          <div aria-hidden="true"
            style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
            className="md:col-span-2">
            <label htmlFor="_hp">Leave this field empty</label>
            <input id="_hp" name="_hp" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-start gap-3 cursor-pointer text-[0.875rem] text-[var(--color-ink-2)] leading-[1.5]">
              <input id="gdprConsent" type="checkbox" name="gdprConsent" required
                aria-invalid={Boolean(errors.gdprConsent)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--color-rule)] text-[var(--color-fjord)] focus:ring-[var(--color-ink)]/30" />
              <span>
                {tf("gdprLabel").replace(tf("gdprLinkText"), "##LINK##").split("##LINK##").map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <Link href="/privacy" className="underline hover:text-[var(--color-ink)]">{tf("gdprLinkText")}</Link>
                    )}
                  </span>
                ))}
              </span>
            </label>
            {errors.gdprConsent && (
              <p className="mt-1.5 text-xs text-[var(--color-ember-2)]" role="alert">{tf("gdprRequired")}</p>
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
  label, name, type = "text", error, required,
}: {
  label: string; name: string; type?: string; error?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="eyebrow text-[var(--color-ink)] block mb-3">{label}</label>
      <input id={name} name={name} type={type} required={required}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined}
        className="w-full rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-canvas)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]/30" />
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-xs text-[var(--color-ember-2)]" role="alert">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. (Page render verified in Task 6.)

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(marketing)/careers/CareersForm.tsx"
git commit -m "feat(careers): add CareersForm component"
```

---

### Task 6: Careers page + metadata

**Files:**
- Create: `app/[locale]/(marketing)/careers/page.tsx`

- [ ] **Step 1: Implement the page** (model: the contact `page.tsx` for metadata/`alternatesForPathname`)

Create `app/[locale]/(marketing)/careers/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { alternatesForPathname } from "@/lib/seo";
import { CareersForm } from "./CareersForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "careers" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: alternatesForPathname("/careers", locale),
  };
}

export default async function CareersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CareersForm />;
}
```

> Note: confirm `alternatesForPathname` is exported from `lib/seo` (the contact page uses it). If its signature differs, match the contact page's exact usage.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0 (will still error on the `/careers` route type until Task 7 adds it to `routing.ts` — do Task 7 next, then re-run).

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(marketing)/careers/page.tsx"
git commit -m "feat(careers): add /careers page + metadata"
```

---

### Task 7: Localized route + header/footer nav link

**Files:**
- Modify: `lib/i18n/routing.ts`
- Modify: `components/marketing/MarketingHeader.tsx`
- Modify: `components/marketing/MarketingFooter.tsx`

- [ ] **Step 1: Add the localized pathname**

In `lib/i18n/routing.ts`, inside `pathnames`, add after the `/about` block:

```ts
    "/careers": {
      sk: "/kariera",
      en: "/careers",
      de: "/karriere",
      fr: "/carrieres",
      sv: "/karriar",
    },
```

- [ ] **Step 2: Add the desktop + mobile nav link in the header**

In `components/marketing/MarketingHeader.tsx`, after the desktop `About` link (`<Link href="/about" className={navLinkCls}>{t("about")}</Link>`), add:

```tsx
          <Link href="/careers" className={navLinkCls}>
            {t("careers")}
          </Link>
```

And in the mobile menu, after the mobile `About` link, add:

```tsx
            <Link href="/careers" className={mobileLinkCls} onClick={() => setOpen(false)}>
              {t("careers")}
            </Link>
```

- [ ] **Step 3: Add the footer link**

In `components/marketing/MarketingFooter.tsx`, inside the `FooterCol title={tf("company")}` list, add a list item after the About link:

```tsx
              <li>
                <Link href="/careers" className={footerLinkCls}>
                  {t("careers")}
                </Link>
              </li>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0 (the `/careers` route type now exists; `t("careers")` resolves once Task 8 adds the key — adding it before this renders avoids a runtime miss, so do Task 8 next).

- [ ] **Step 5: Commit**

```bash
git add lib/i18n/routing.ts components/marketing/MarketingHeader.tsx components/marketing/MarketingFooter.tsx
git commit -m "feat(careers): wire /careers route + header/footer nav"
```

---

### Task 8: i18n — `careers` namespace + `nav.careers` (5 locales)

**Files:**
- Modify: `messages/en.json`, `messages/sk.json`, `messages/de.json`, `messages/fr.json`, `messages/sv.json`

- [ ] **Step 1: Add `nav.careers` to every locale**

In each `messages/<locale>.json`, add a `careers` key to the existing `nav` object:
- en/de/fr/sv: `"careers": "Careers"` (de: `"Karriere"`, fr: `"Carrières"`, sv: `"Karriär"`)
- sk: `"careers": "Kariéra"`

- [ ] **Step 2: Add the `careers` namespace**

Add this block to `messages/en.json` (top-level, alongside `contact`):

```json
"careers": {
  "title": "Join our team",
  "subtitle": "Work with us",
  "form": {
    "name": "Full name",
    "email": "Email",
    "phone": "Phone",
    "location": "Location",
    "trades": "Which trades can you do?",
    "tradeOther": "Other",
    "experienceYears": "Years of experience",
    "availableFrom": "Available from",
    "languages": "Languages",
    "cvUrl": "Link to CV or portfolio (optional)",
    "willingToTravel": "I'm willing to travel for projects",
    "drivingLicence": "I hold a driving licence",
    "message": "Anything else you'd like us to know",
    "submit": "Send application",
    "success": "Thank you — we've received your application and will be in touch.",
    "error": "Something went wrong. Please try again.",
    "gdprLabel": "I agree to the processing of my personal data per the privacy policy.",
    "gdprLinkText": "privacy policy",
    "gdprRequired": "Consent is required."
  }
}
```

Add the same structure to `sk.json` (Slovak — primary), `de.json`, `fr.json`, `sv.json` with translated values. **All five files must contain every key** or next-intl throws a missing-message error at render. (English values are an acceptable interim fallback for non-primary locales per the spec; replace with professional translations when available.)

Slovak values for `sk.json`:
```json
"careers": {
  "title": "Pridajte sa k nášmu tímu",
  "subtitle": "Pracujte s nami",
  "form": {
    "name": "Meno a priezvisko",
    "email": "E-mail",
    "phone": "Telefón",
    "location": "Lokalita",
    "trades": "Ktoré remeslá ovládate?",
    "tradeOther": "Iné",
    "experienceYears": "Roky praxe",
    "availableFrom": "Dostupný od",
    "languages": "Jazyky",
    "cvUrl": "Odkaz na životopis alebo portfólio (nepovinné)",
    "willingToTravel": "Som ochotný cestovať za prácou",
    "drivingLicence": "Mám vodičský preukaz",
    "message": "Čokoľvek ďalšie, čo by sme mali vedieť",
    "submit": "Odoslať žiadosť",
    "success": "Ďakujeme — vašu žiadosť sme prijali a ozveme sa vám.",
    "error": "Niečo sa pokazilo. Skúste to znova.",
    "gdprLabel": "Súhlasím so spracovaním osobných údajov podľa zásad ochrany súkromia.",
    "gdprLinkText": "zásad ochrany súkromia",
    "gdprRequired": "Súhlas je povinný."
  }
}
```

- [ ] **Step 3: Verify JSON validity + build the route**

Run: `node -e "['sk','en','de','fr','sv'].forEach(l=>require('./messages/'+l+'.json'))"`
Expected: no output / no error (all files parse).

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Manual verification (dev server on :3000)**

Visit `http://localhost:3000/en/careers`. Expected: the page renders with the heading "Join our team", the trade checkboxes, all fields, and the Careers link appears in the header. Submit a valid form → success message; confirm a `WorkerApplication` row via `npx prisma studio`. Visit `http://localhost:3000/sk/kariera` → renders with Slovak labels.

- [ ] **Step 5: Commit**

```bash
git add messages/*.json
git commit -m "feat(careers): add careers + nav i18n (5 locales)"
```

---

**PHASE 1 CHECKPOINT** — run the full suite before moving on:
```bash
npx vitest run && npx tsc --noEmit && npx eslint "app/**/*.tsx" "components/**/*.tsx" "lib/**/*.ts"
```
Expected: tests pass, exit 0, no lint errors. The worker application flow is now complete (form → DB → email).

---

# PHASE 2 — Portal admin views

### Task 9: Add `InquiryStatus` to customer leads

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the enum + status field**

Add the enum (with the other enums):
```prisma
enum InquiryStatus {
  NEW
  IN_PROGRESS
  CLOSED
}
```

Add to the `ContactSubmission` model (before `createdAt`):
```prisma
  status      InquiryStatus @default(NEW)
```
And add an index inside the model:
```prisma
  @@index([status])
```

- [ ] **Step 2: Migrate**

Run: `npx prisma migrate dev --name add_inquiry_status`
Expected: migration created + applied; existing rows default to `NEW`.

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` → exit 0.
```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(inquiries): add status to ContactSubmission"
```

---

### Task 10: Portal nav entries

**Files:**
- Modify: `lib/portal-nav.ts`
- Modify: `lib/i18n/routing.ts`
- Modify: `messages/{sk,en,de,fr,sv}.json`

- [ ] **Step 1: Widen the union + add ADMIN items**

Replace `lib/portal-nav.ts` contents:

```ts
export type PortalNavItem = {
  href: string;
  labelKey:
    | "dashboard"
    | "projects"
    | "workers"
    | "accommodations"
    | "wages"
    | "applications"
    | "inquiries";
};

/**
 * Portal navigation destinations. `labelKey` is a key in the `nav`
 * next-intl namespace — each consumer resolves it with its own `t`.
 */
export function getPortalNavItems(role: "ADMIN" | "WORKER"): PortalNavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/dashboard", labelKey: "dashboard" },
      { href: "/projects", labelKey: "projects" },
      { href: "/workers", labelKey: "workers" },
      { href: "/accommodations", labelKey: "accommodations" },
      { href: "/wages", labelKey: "wages" },
      { href: "/applications", labelKey: "applications" },
      { href: "/inquiries", labelKey: "inquiries" },
    ];
  }
  return [
    { href: "/dashboard", labelKey: "dashboard" },
    { href: "/wages", labelKey: "wages" },
  ];
}
```

- [ ] **Step 2: Add portal pathnames**

In `lib/i18n/routing.ts`, in the portal section (after `/wages`), add:
```ts
    "/applications": "/applications",
    "/inquiries": "/inquiries",
```

- [ ] **Step 3: Add nav labels to all 5 message files**

Add to each `nav` object:
- en: `"applications": "Applications"`, `"inquiries": "Inquiries"`
- sk: `"applications": "Žiadosti"`, `"inquiries": "Dopyty"`
- de: `"applications": "Bewerbungen"`, `"inquiries": "Anfragen"`
- fr: `"applications": "Candidatures"`, `"inquiries": "Demandes"`
- sv: `"applications": "Ansökningar"`, `"inquiries": "Förfrågningar"`

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` → exit 0.
```bash
git add lib/portal-nav.ts lib/i18n/routing.ts messages/*.json
git commit -m "feat(portal): add applications + inquiries nav"
```

---

### Task 11: Applications list + detail + status action

**Files:**
- Create: `app/[locale]/(portal)/applications/page.tsx`
- Create: `app/[locale]/(portal)/applications/[id]/page.tsx`
- Modify: `messages/{sk,en,de,fr,sv}.json` (add `applications` namespace)

- [ ] **Step 1: Add the `applications` message namespace (all 5 files)**

English (`en.json`, top-level):
```json
"applications": {
  "list": "Worker applications",
  "trades": "Trades",
  "experience": "Experience",
  "received": "Received",
  "detail": "Application detail",
  "updateStatus": "Update status",
  "save": "Save",
  "status": {
    "NEW": "New",
    "REVIEWING": "Reviewing",
    "CONTACTED": "Contacted",
    "REJECTED": "Rejected",
    "HIRED": "Hired"
  }
}
```
Add the same keys to sk/de/fr/sv with translated values (status labels translated; English acceptable as interim for non-primary locales).

- [ ] **Step 2: Implement the list page** (model: `workers/page.tsx`)

Create `app/[locale]/(portal)/applications/page.tsx`:

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { DataTable } from "@/components/portal/DataTable";

export default async function ApplicationsListPage() {
  await requireAdmin();
  const t = await getTranslations("applications");
  const tCommon = await getTranslations("common");
  const apps = await prisma.workerApplication.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("list")}</h1>
      <DataTable
        headers={[tCommon("name"), t("trades"), t("experience"), tCommon("status"), t("received"), tCommon("actions")]}
        rows={apps.map((a) => [
          a.name,
          a.trades.join(", "),
          a.experienceYears != null ? String(a.experienceYears) : "—",
          t(`status.${a.status}`),
          a.createdAt.toLocaleDateString(),
          <Link key={a.id} href={`/applications/${a.id}`} className="text-navy underline">
            {tCommon("edit")}
          </Link>,
        ])}
      />
    </div>
  );
}
```

- [ ] **Step 3: Implement the detail page + status server action**

Create `app/[locale]/(portal)/applications/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";

const STATUSES: ApplicationStatus[] = ["NEW", "REVIEWING", "CONTACTED", "REJECTED", "HIRED"];

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("applications");
  const app = await prisma.workerApplication.findUnique({ where: { id } });
  if (!app) notFound();

  async function updateStatus(formData: FormData) {
    "use server";
    await requireAdmin();
    const status = String(formData.get("status")) as ApplicationStatus;
    if (!STATUSES.includes(status)) return;
    await prisma.workerApplication.update({ where: { id }, data: { status } });
    revalidatePath(`/applications/${id}`);
  }

  const rows: [string, string][] = [
    ["Name", app.name],
    ["Email", app.email],
    ["Phone", app.phone ?? "—"],
    ["Trades", app.trades.join(", ")],
    ["Experience", app.experienceYears != null ? `${app.experienceYears} years` : "—"],
    ["Location", app.location ?? "—"],
    ["Willing to travel", app.willingToTravel ? "Yes" : "No"],
    ["Available from", app.availableFrom ?? "—"],
    ["Languages", app.languages ?? "—"],
    ["Driving licence", app.drivingLicence ? "Yes" : "No"],
    ["CV / portfolio", app.cvUrl ?? "—"],
    ["Message", app.message || "—"],
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("detail")}</h1>
      <dl className="divide-y divide-border-soft border-y border-border-soft">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[10rem_1fr] gap-4 py-3 text-sm">
            <dt className="text-slate-ink">{label}</dt>
            <dd className="text-navy break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <form action={updateStatus} className="mt-8 flex items-end gap-3">
        <div>
          <label htmlFor="status" className="block text-sm text-slate-ink mb-2">{t("updateStatus")}</label>
          <select id="status" name="status" defaultValue={app.status}
            className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-navy">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="primary">{t("save")}</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Manual verification**

As an ADMIN (log into the portal), visit `/en/applications` → list shows submitted applications; click a row → detail renders; change status → Save → status persists (verify in `prisma studio` or by reloading). As a WORKER, visiting `/en/applications` should redirect to `/dashboard` (via `requireAdmin`).

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(portal)/applications" messages/*.json
git commit -m "feat(portal): worker applications admin list + detail + status"
```

---

### Task 12: Inquiries (customer leads) list + detail + status action

**Files:**
- Create: `app/[locale]/(portal)/inquiries/page.tsx`
- Create: `app/[locale]/(portal)/inquiries/[id]/page.tsx`
- Modify: `messages/{sk,en,de,fr,sv}.json` (add `inquiries` namespace)

- [ ] **Step 1: Add the `inquiries` message namespace (all 5 files)**

English (`en.json`):
```json
"inquiries": {
  "list": "Customer inquiries",
  "service": "Service",
  "received": "Received",
  "detail": "Inquiry detail",
  "updateStatus": "Update status",
  "save": "Save",
  "status": {
    "NEW": "New",
    "IN_PROGRESS": "In progress",
    "CLOSED": "Closed"
  }
}
```
Add the same keys to sk/de/fr/sv with translated values.

- [ ] **Step 2: Implement the list page**

Create `app/[locale]/(portal)/inquiries/page.tsx`:

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { DataTable } from "@/components/portal/DataTable";

export default async function InquiriesListPage() {
  await requireAdmin();
  const t = await getTranslations("inquiries");
  const tCommon = await getTranslations("common");
  const tServices = await getTranslations("services");
  const rows = await prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("list")}</h1>
      <DataTable
        headers={[tCommon("name"), tCommon("email"), t("service"), tCommon("status"), t("received"), tCommon("actions")]}
        rows={rows.map((r) => [
          r.name,
          r.email,
          r.serviceType === "other" ? "—" : tServices(`${r.serviceType}.name`),
          t(`status.${r.status}`),
          r.createdAt.toLocaleDateString(),
          <Link key={r.id} href={`/inquiries/${r.id}`} className="text-navy underline">
            {tCommon("edit")}
          </Link>,
        ])}
      />
    </div>
  );
}
```

- [ ] **Step 3: Implement the detail page + status action**

Create `app/[locale]/(portal)/inquiries/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { InquiryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";

const STATUSES: InquiryStatus[] = ["NEW", "IN_PROGRESS", "CLOSED"];

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("inquiries");
  const row = await prisma.contactSubmission.findUnique({ where: { id } });
  if (!row) notFound();

  async function updateStatus(formData: FormData) {
    "use server";
    await requireAdmin();
    const status = String(formData.get("status")) as InquiryStatus;
    if (!STATUSES.includes(status)) return;
    await prisma.contactSubmission.update({ where: { id }, data: { status } });
    revalidatePath(`/inquiries/${id}`);
  }

  const fields: [string, string][] = [
    ["Name", row.name],
    ["Email", row.email],
    ["Phone", row.phone ?? "—"],
    ["Company", row.company ?? "—"],
    ["Service", row.serviceType],
    ["Message", row.message || "—"],
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("detail")}</h1>
      <dl className="divide-y divide-border-soft border-y border-border-soft">
        {fields.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[10rem_1fr] gap-4 py-3 text-sm">
            <dt className="text-slate-ink">{label}</dt>
            <dd className="text-navy break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <form action={updateStatus} className="mt-8 flex items-end gap-3">
        <div>
          <label htmlFor="status" className="block text-sm text-slate-ink mb-2">{t("updateStatus")}</label>
          <select id="status" name="status" defaultValue={row.status}
            className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-navy">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="primary">{t("save")}</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Manual verification**

As ADMIN visit `/en/inquiries` → existing contact submissions listed; open one → detail renders; change status → Save → persists. As WORKER → redirected to `/dashboard`.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(portal)/inquiries" messages/*.json
git commit -m "feat(portal): customer inquiries admin list + detail + status"
```

---

**PHASE 2 CHECKPOINT** — final verification:
```bash
npx vitest run && npx tsc --noEmit && npx eslint "app/**/*.tsx" "components/**/*.tsx" "lib/**/*.ts"
```
Expected: tests pass, exit 0, no lint errors. Manually walk both portal sections as ADMIN and confirm WORKER is gated out.

---

## Verification Notes

- **Translations:** sk is the primary locale (default). The plan ships professional Slovak + English; de/fr/sv use the same keys (English values acceptable as interim per the spec). All five files must contain every key or next-intl throws at render.
- **Env for email:** notifications require `SMTP_HOST` + `CONTACT_NOTIFY_EMAIL` (+ `SMTP_*`). Without them the mailer no-ops and the DB write still succeeds — this is expected in local dev.
- **No production build during dev:** a running `next dev` owns `.next`; rely on `tsc` + `eslint` + manual checks (or stop the dev server before `next build`).
