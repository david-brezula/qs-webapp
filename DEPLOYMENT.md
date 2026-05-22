# Deployment — manual steps (require David's credentials)

These steps cannot be done autonomously; they need access to the Vercel
dashboard, the domain registrar, and the production database. Do them in order.

## 0. Apply database migrations (REQUIRED before deploy)

The codebase adds `User.locale` (migration `20260522120000_add_user_locale`),
which is **not yet applied** to the database. Apply all pending migrations:

```bash
# against the production DATABASE_URL (Supabase / Postgres):
npx prisma migrate deploy
```

If you develop locally first: `npx prisma migrate dev`. The migration is
non-destructive (adds a `locale` column, backfilled from `language`).

> Until this runs, Task 20's locale-preference features (login redirect to the
> user's locale, the portal language switcher persisting to the DB) will error
> at runtime, because they read/write `User.locale`.

## 1. Confirm the canonical domain ⚠️

The code defaults to **`quantum-sphere.eu`** (with a hyphen) via
`NEXT_PUBLIC_SITE_URL`. The original solar site used **`quantumsphere.eu`**
(no hyphen) in a few places (e.g. the footer email `rfp@quantumsphere.eu`).
**Decide the canonical domain** and make the env vars + email consistent.

## 2. Production domains in Vercel

- Add `quantum-sphere.eu` (marketing host) with a `www.` → apex redirect.
- Add `app.quantum-sphere.eu` (portal host).
- Both point at the same Vercel deployment (host routing is handled in
  `proxy.ts` — see Task 18).

## 3. DNS records (at the domain registrar)

- `quantum-sphere.eu` → Vercel A record `76.76.21.21` (or current Vercel guidance).
- `www.quantum-sphere.eu` → CNAME `cname.vercel-dns.com`.
- `app.quantum-sphere.eu` → CNAME `cname.vercel-dns.com`.

## 4. Environment variables (Vercel → Production)

- `NEXT_PUBLIC_SITE_URL=https://quantum-sphere.eu`
- `NEXT_PUBLIC_APP_URL=https://app.quantum-sphere.eu`
- `AUTH_SECRET=<existing>`
- `AUTH_URL=https://app.quantum-sphere.eu`  (NextAuth lives on the portal host)
- `DATABASE_URL=<existing>` (+ any direct/pooled URL Prisma needs)
- Optional contact email: `CONTACT_NOTIFY_EMAIL`, `SMTP_HOST`, `SMTP_PORT`,
  `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

## 5. Verify after DNS propagates

- `https://quantum-sphere.eu/` → 307 → `https://quantum-sphere.eu/sk`.
- Marketing host serving a portal path (e.g. `/sk/dashboard`) → redirects to the
  portal host (Task 18). Portal host serving a marketing path → redirects to the
  marketing host.
- Auth cookie is set on the `.quantum-sphere.eu` domain so it works across hosts.
- `https://quantum-sphere.eu/sitemap.xml` and `/robots.txt` resolve.

## 6. Post-launch follow-ups (not blockers)

- **Native-speaker review** of all translated copy (`messages/{sk,en,de,fr,sv}.json`
  carry `_TODO` markers); SK copy carries a "review with David" marker.
- **Portal translations** for de/fr/sv: the portal namespaces currently fall back
  to English in those locales (`_TODO_PORTAL_TRANSLATIONS`).
- **ContactSubmission model cleanup**: the generic enquiry form is mapped onto the
  legacy solar columns (`projectType` holds the trade, `notes` holds the message
  + phone, `sizeMW`/`country`/`scope` are unused). Add proper `phone`/`serviceType`/
  `message` columns and drop the solar-only ones when convenient.
- **`User.language` vs `User.locale`** overlap — consider consolidating.
