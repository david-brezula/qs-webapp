# Inquiries — Worker Applications + Customer Leads

**Date:** 2026-05-30
**Status:** Approved (design); ready for implementation plan
**Branch:** `feat/marketing-content`

## Summary

Add an inquiries capability with two audiences:

1. **Workers** — a new public `/careers` page + application form ("join our company").
2. **Customers** — keep the existing `/contact` form unchanged (it already serves customer inquiries).

Both submission types persist to the database **and** send an email notification (mirroring the existing contact pipeline), and both get **ADMIN-only portal views** so staff can review and manage them.

## Decisions (locked)

- **Structure:** keep `/contact` as the customer form (no field changes); add a separate `/careers` worker form. No combined hub.
- **Worker CV:** no file upload. An optional `cvUrl` (link to CV/portfolio) field instead — avoids adding file-storage infrastructure.
- **Customer form:** unchanged from today (name, email, phone, company, single serviceType, message, GDPR).
- **Handling:** DB + email notification **and** portal admin views for both applications and customer leads.

## Existing patterns to follow (do not reinvent)

**Marketing form pipeline** (model: `app/[locale]/(marketing)/contact/ContactForm.tsx` + `app/api/contact/route.ts`):
- Client component: `FormData` → zod `safeParse` → `fetch POST` to an `/api/*` route → success state. Reuses the local `Field` component, a hidden honeypot input `_hp`, a required GDPR consent checkbox linking to `/privacy`, and `track()` from `lib/analytics`.
- API route: `rateLimit(ip, 5, 10*60*1000)` (`lib/rate-limit`) → honeypot check (non-empty `_hp` → quietly return `{ok:true}`) → zod validation → `prisma.<model>.create` → notification email via `lib/mailer` (best-effort, failure logged, request still succeeds) → `{ok:true}`.
- Schema lives in `lib/<name>-schema.ts` (see `lib/contact-schema.ts`).
- Mailer reads `SMTP_*` / `CONTACT_NOTIFY_EMAIL` env; no-ops if unconfigured.

**Portal admin pattern** (model: `app/[locale]/(portal)/workers/page.tsx`):
- Server component: `await requireAdmin()` (`lib/portal/session`) → `getTranslations` → `prisma.<model>.findMany()` → `<DataTable headers={...} rows={...} />` (`components/portal/DataTable`).
- Detail page at `/<resource>/[id]`; mutations via server actions (see existing portal edit forms).
- Nav comes from `lib/portal-nav.ts` `getPortalNavItems(role)`; `Sidebar` resolves `labelKey` against the `nav` next-intl namespace.

**Routing / i18n:**
- 5 locales (`sk, en, de, fr, sv`); localized pathnames declared in `lib/i18n/routing.ts`. Marketing routes get SEO slugs per locale; portal routes use the English slug for all locales.
- Messages in `messages/{sk,en,de,fr,sv}.json`.

## Data model (Prisma — `prisma/schema.prisma`)

New enum:
```prisma
enum ApplicationStatus { NEW REVIEWING CONTACTED REJECTED HIRED }
enum InquiryStatus     { NEW IN_PROGRESS CLOSED }
```

New model:
```prisma
model WorkerApplication {
  id              String            @id @default(cuid())
  name            String
  email           String
  phone           String?
  trades          String[]          // service slugs: solar/electrical/drywall/masonry/roofing (+ "other")
  experienceYears Int?
  location        String?
  willingToTravel Boolean           @default(false)
  availableFrom   String?           // free text (e.g. "immediately", "June 2026")
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

Extend existing `ContactSubmission` (customer leads), public form unchanged:
```prisma
  status    InquiryStatus @default(NEW)
  @@index([status])
```

Two `prisma migrate dev` migrations (one per concern is fine, or a single migration covering both).

## Worker `/careers` form (public)

- **Page:** `app/[locale]/(marketing)/careers/page.tsx` — metadata + intro copy + `<CareersForm />`. Same layout/section conventions as the contact page; current restrained design system (neutral surfaces, one accent, subtle motion via existing primitives).
- **Form:** `app/[locale]/(marketing)/careers/CareersForm.tsx` — clone of `ContactForm` structure. Fields:
  - name (required), email (required), phone (optional)
  - trades — multi-select checkboxes from `SERVICES` (+ "other"); at least one required
  - experienceYears (optional number), location (optional), willingToTravel (checkbox)
  - availableFrom (optional text), languages (optional), drivingLicence (checkbox)
  - cvUrl (optional URL), message (optional, max 4000)
  - honeypot `_hp`, GDPR consent (required) → `/privacy`
- **Schema:** `lib/careers-schema.ts` — `careersSchema` (zod) + `CareersPayload`. `trades: z.array(z.enum(SERVICE_TYPES)).min(1)`, `cvUrl: z.string().url().optional().or(z.literal(""))`, `gdprConsent: z.literal(true)`, `_hp: z.string().max(0).optional()`.
- **Analytics:** `track("career_application_submitted", { trades })` on success.

## Pipeline

- `app/api/careers/route.ts` — identical shape to `app/api/contact/route.ts`: rate limit → honeypot → `careersSchema.safeParse` → `prisma.workerApplication.create` → `sendWorkerApplicationNotification(...)` (best-effort) → `{ok:true}`.
- `lib/mailer.ts` — add `sendWorkerApplicationNotification(data)`: subject `New job application — {name}{trades}`; `replyTo` = applicant email; plain-text body of all fields; same env guard/no-op as `sendContactNotification`.

## Portal admin (ADMIN-only)

- **Applications list:** `app/[locale]/(portal)/applications/page.tsx` — `requireAdmin()` → `prisma.workerApplication.findMany({ orderBy: { createdAt: "desc" } })` → `DataTable` (name, trades, experience, status, date, "view" link).
- **Application detail:** `app/[locale]/(portal)/applications/[id]/page.tsx` — full record + a **status `<select>`** wired to a server action `updateApplicationStatus(id, status)` (follow existing portal server-action/form pattern; `requireAdmin()` inside the action).
- **Inquiries (customer leads) list + detail:** `app/[locale]/(portal)/inquiries/page.tsx` and `[id]/page.tsx` — same pattern over `ContactSubmission`, with `updateInquiryStatus(id, status)`.
- **Nav:** extend `lib/portal-nav.ts` — add `{ href: "/applications", labelKey: "applications" }` and `{ href: "/inquiries", labelKey: "inquiries" }` to the ADMIN list; widen the `PortalNavItem["labelKey"]` union accordingly. Add `nav.applications` / `nav.inquiries` to all 5 message files.

## Routing & i18n

- `lib/i18n/routing.ts`:
  - Marketing `/careers`: `sk:/kariera`, `en:/careers`, `de:/karriere`, `fr:/carrieres`, `sv:/karriar`.
  - Portal `/applications` and `/inquiries`: English slug for all locales (like other portal routes).
- Marketing nav: add a **Careers** link to `MarketingHeader` (desktop + mobile) and optionally the footer "Company" column → `nav.careers`.
- New message namespaces in all 5 files: `careers` (page + `careers.form.*` labels, success, errors), `applications` and `inquiries` (portal table headers, status labels, detail labels). Translate for sk/en/de/fr/sv (English acceptable as initial placeholder for non-primary locales if professional translations aren't available, matching current content conventions).

## Build phases

- **Phase 1 — Worker careers form (public, end-to-end):** `WorkerApplication` model + migration; `lib/careers-schema.ts`; `/careers` page + `CareersForm`; `/api/careers` route; `sendWorkerApplicationNotification`; routing `/careers`; header/footer nav; `careers` i18n. Delivers a working applicant flow (DB + email).
- **Phase 2 — Portal admin:** `status` fields + enums + migration; portal nav entries; `/applications` and `/inquiries` lists + detail + status server actions; portal i18n. Surfaces both applications and customer leads to admins.

## Error handling & edge cases

- Rate limiting and honeypot identical to contact (spam control).
- Email send is best-effort; DB persistence is the source of truth.
- `cvUrl` validated as a URL (or empty); never fetched/opened server-side.
- Status updates gated by `requireAdmin()` server-side (not just UI).
- Multi-locale: every new user-facing string added to all 5 message files; missing-key errors avoided by adding keys before referencing them.

## Testing

- Unit: `careersSchema` (valid payload, missing required trades, bad email, bad URL, honeypot non-empty, GDPR false) via vitest (project uses vitest).
- API: POST `/api/careers` happy path persists + returns ok; honeypot returns ok without persisting; invalid payload → 400; over-limit → 429.
- Manual: submit `/careers` in dev, confirm row created (`prisma studio`) and (if SMTP configured) email; verify `/applications` + `/inquiries` admin lists and status changes as ADMIN; confirm WORKER role is redirected.

## Out of scope

CV **file** upload (URL field instead), applicant auto-reply emails, CRM/pipeline beyond a status field, customer contact-form redesign, bulk export.
