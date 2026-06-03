# Legal Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring quantum-sphere.eu into GDPR/ePrivacy/§ 3a Obchodného zákonníka compliance and fix the locale-default UX so Slovak visitors land on `/sk` regardless of browser language.

**Architecture:** Five concrete deliverables: (1) cookie-consent banner that gates PostHog initialization, (2) Privacy Policy and (3) Cookies Policy pages added to the existing localized routing/messages system, (4) GDPR checkbox + honeypot anti-spam on the contact form, (5) footer cleanup (remove IBAN, add IČO + zápis v OR). All five locales (`sk` / `en` / `de` / `fr` / `sv`) must be covered using the existing next-intl patterns (`routing.pathnames`, `messages/*.json`, `lib/seo.ts.alternatesForPathname`). Default locale detection switched off so the SK default isn't overridden by `Accept-Language`.

**Tech Stack:** Next.js 16 (App Router under `app/[locale]/(marketing)`), next-intl 4.12, Tailwind v4, Zod, Prisma, PostHog (US cloud). Read `node_modules/next/dist/docs/` if you reach for any unfamiliar Next.js API — the codebase warning in `AGENTS.md` says training data differs from the installed version.

**Out of scope** (deferred to a separate plan): photos, references / case studies, blog, certificates, Google Maps embed, sticky mobile CTA, WhatsApp/Viber, social links, LocalBusiness JSON-LD, lokalizované landing pages, video. Those are content/feature work, not legal compliance.

---

## Files Map

**Create:**
- `app/[locale]/(marketing)/privacy/page.tsx` — server component, renders Privacy Policy from messages, exports `generateMetadata`.
- `app/[locale]/(marketing)/cookies/page.tsx` — server component, renders Cookies Policy from messages, exports `generateMetadata`.
- `components/marketing/LegalDoc.tsx` — shared layout wrapper (typography, container, prose styles) for Privacy + Cookies pages so the two share one design.
- `components/marketing/CookieConsent.tsx` — client component, sticky banner with Accept / Decline, persists decision to cookie.
- `lib/consent.ts` — small client+server helper to read/write the `qs_consent` cookie (`"granted" | "denied" | undefined`).
- `lib/actions/consent.ts` — server action `setConsent(value)` that writes the cookie via `next/headers`.

**Modify:**
- `lib/i18n/routing.ts` — add `/privacy` and `/cookies` to `pathnames` with localized slugs; set `localeDetection: false`.
- `lib/content.ts` — replace `vat: "VAT … · IBAN …"` with structured `vat`, `companyId` (IČO), `companyRegistration` (zápis v OR); drop IBAN entirely.
- `components/marketing/MarketingFooter.tsx` — render the structured company-identity row (VAT · IČO · OR); add legal links (Privacy, Cookies).
- `lib/contact-schema.ts` — add `gdprConsent: z.literal(true)`; add `_hp: z.string().max(0).optional()` honeypot.
- `app/[locale]/(marketing)/contact/ContactForm.tsx` — render GDPR checkbox + privacy link, render hidden honeypot, wire into existing payload.
- `app/api/contact/route.ts` — short-circuit (silently 200) if honeypot is filled; ensure schema validation rejects missing consent (already enforced by Zod).
- `components/analytics/PostHogProvider.tsx` — only call `posthog.init` when `qs_consent === "granted"`; re-init when consent flips.
- `app/[locale]/layout.tsx` — mount `<CookieConsent />`.
- `lib/seo.ts` (only if needed) — verify `alternatesForPathname` handles the two new paths (it already does because it reads `routing.pathnames`).
- `messages/sk.json` — add `legal.privacy.*`, `legal.cookies.*`, `consent.*`, extend `nav.privacy` / `nav.cookies` / `footer.legal`, extend `contact.form.gdpr*`, extend `footer.companyId` / `footer.registration`.
- `messages/en.json` / `de.json` / `fr.json` / `sv.json` — same key set, translated.

**Test:**
- `lib/contact-schema.test.ts` — extend with `gdprConsent` required + honeypot accepted-when-empty cases.

---

## Pre-flight — data the executor needs from David

Before Task 2, ask David for and record in this plan (replace the literals everywhere they appear):

- **IČO** (8-digit company ID).
- **Zápis v obchodnom registri**: Okresný súd `<…>`, Oddiel: `<Sro/…>`, Vložka č. `<…>`.

Until those are received, do **NOT** ship Task 2 to production — placeholder text in the footer is worse than nothing for a Slovak s.r.o. (§ 3a ObchZ requires the real values).

The plan uses these literal placeholders that must be substituted:
- `__ICO_PLACEHOLDER__` (e.g. `12345678`)
- `__OR_SUD_PLACEHOLDER__` (e.g. `Okresný súd Bratislava III`)
- `__OR_ODDIEL_PLACEHOLDER__` (e.g. `Sro`)
- `__OR_VLOZKA_PLACEHOLDER__` (e.g. `123456/B`)

---

### Task 1: Default to SK locale regardless of Accept-Language

**Files:**
- Modify: `lib/i18n/routing.ts` (add one line)

**Why:** `curl -sI -H "Accept-Language: en-US,en;q=0.9" https://qs-webapp.vercel.app/` currently 307s to `/en` because `next-intl` defaults `localeDetection: true`. For a Slovak construction company, the SK landing must be the default; users can switch via the language switcher. This single line is what caused David's "web je celý v angličtine" observation.

- [ ] **Step 1: Read the current routing config**

Open `lib/i18n/routing.ts`. The `defineRouting` call has no `localeDetection` key (so it uses the next-intl default = `true`).

- [ ] **Step 2: Edit `lib/i18n/routing.ts`**

Add `localeDetection: false` immediately after `localePrefix: "always"`:

```ts
export const routing = defineRouting({
  locales: ["sk", "en", "de", "fr", "sv"],
  defaultLocale: "sk",
  localePrefix: "always",
  localeDetection: false,

  pathnames: { /* … unchanged … */ },
});
```

- [ ] **Step 3: Build + smoke-test locally**

```bash
npm run build
npm run start &  # or `npm run dev`
# Wait for "Ready in …"
curl -sI -H "Accept-Language: en-US,en;q=0.9" http://localhost:3000/
# Expected: HTTP/1.1 307  Location: /sk
curl -sI -H "Accept-Language: de-DE,de;q=0.9" http://localhost:3000/
# Expected: HTTP/1.1 307  Location: /sk
curl -sI http://localhost:3000/sk
# Expected: 200
# Language switcher must still work — visit /sk, click EN, URL becomes /en/…
```

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/routing.ts
git commit -m "fix(i18n): default root to /sk regardless of Accept-Language

next-intl localeDetection was true by default, redirecting EN/DE browsers
to /en or /de instead of the SK default. For an SK-targeted construction
business, SK must be the landing locale; users opt-in to other languages
via the switcher."
```

---

### Task 2: Footer — remove IBAN, add IČO + zápis v OR

**Files:**
- Modify: `lib/content.ts`
- Modify: `components/marketing/MarketingFooter.tsx`
- Modify: `messages/sk.json` (footer keys)

**Why:** IBAN on a public website is a phishing-invoice vector and adds zero value. § 3a Obchodného zákonníka requires every Slovak s.r.o. to publish IČO and the OR entry on its web. Right now we have neither.

**Prereq:** David has provided real IČO + OR values (see Pre-flight section); substitute the four placeholders below.

- [ ] **Step 1: Edit `lib/content.ts`**

Replace the file body with:

```ts
// Company contact + identity details shared by the marketing footer.
// (The former solar-marketing copy/data was removed in the 5-trade rebrand.)
export const FOOTER = {
  address: "Mlynské Nivy 5 · 821 09 Bratislava · Slovak Republic",
  phone: "+421 2 5556 0188",
  email: "rfp@quantum-sphere.eu",
  vat: "SK2120988117",
  companyId: "__ICO_PLACEHOLDER__",
  registration:
    "__OR_SUD_PLACEHOLDER__, Oddiel: __OR_ODDIEL_PLACEHOLDER__, Vložka č. __OR_VLOZKA_PLACEHOLDER__",
};
```

- [ ] **Step 2: Edit `messages/sk.json` — `footer` namespace**

Add three new keys (preserve existing `tagline`, `company`, `rights`):

```json
"footer": {
  "tagline": "...existing...",
  "company": "...existing...",
  "rights": "...existing...",
  "legal": "Právne informácie",
  "privacy": "Ochrana osobných údajov",
  "cookies": "Cookies",
  "companyIdLabel": "IČO",
  "vatLabel": "DIČ",
  "registrationLabel": "Zápis"
}
```

- [ ] **Step 3: Edit `components/marketing/MarketingFooter.tsx`**

Rewrite the bottom bar (`<Container className="py-6 …">…</Container>` at the bottom) to render structured identity. Replace the existing bottom bar with:

```tsx
<Container className="py-6 border-t border-[var(--color-rule)] flex flex-col gap-4 text-[0.6875rem] text-[var(--color-slate)] font-mono">
  <div className="flex flex-col md:flex-row md:items-baseline md:flex-wrap gap-x-4 gap-y-2 normal-case tracking-normal">
    <span className="font-semibold uppercase tracking-[0.18em]">
      © {year} Quantum Sphere s.r.o.
    </span>
    <span>
      {tf("companyIdLabel")} {FOOTER.companyId}
    </span>
    <span>
      {tf("vatLabel")} {FOOTER.vat}
    </span>
    <span>
      {tf("registrationLabel")}: {FOOTER.registration}
    </span>
  </div>
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 uppercase tracking-[0.18em]">
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      <Link href="/privacy" className="hover:text-[var(--color-ink)] transition-colors">
        {tf("privacy")}
      </Link>
      <Link href="/cookies" className="hover:text-[var(--color-ink)] transition-colors">
        {tf("cookies")}
      </Link>
      <span className="normal-case tracking-normal">
        {tf("rights")}
      </span>
    </div>
    <LanguageSwitcher align="right" placement="top" />
  </div>
</Container>
```

The `tf` translator (already declared at the top of the file via `useTranslations("footer")`) now needs the three new keys — that's why Step 2 comes first.

- [ ] **Step 4: Build + smoke-test**

```bash
npm run build
npm run start &
# Visit http://localhost:3000/sk and scroll to the footer.
# Verify: IČO, DIČ, "Zápis: Okresný súd …, Oddiel: Sro, Vložka č. …" all render.
# Verify: no IBAN anywhere on the page (Ctrl+F "IBAN" → 0 results).
# Verify: "Ochrana osobných údajov" + "Cookies" links visible (they 404 until Task 3/4 — that's fine for now).
```

- [ ] **Step 5: Commit**

```bash
git add lib/content.ts components/marketing/MarketingFooter.tsx messages/sk.json
git commit -m "feat(footer): add IČO + OR per § 3a ObchZ, drop IBAN

§ 3a Obchodného zákonníka requires a Slovak s.r.o. to publish its IČO
and obchodný register entry on the web. Adds both and drops the IBAN
(IBAN on a public site is a phishing-invoice vector with no upside —
it belongs on invoices, not the marketing footer). Footer now also
links to the upcoming Privacy and Cookies pages."
```

> EN/DE/FR/SV translations for the three new footer keys land in Task 9 — until then those locales render the SK strings (acceptable transient state for one commit).

---

### Task 3: Privacy Policy page (SK content + route)

**Files:**
- Modify: `lib/i18n/routing.ts` (add `/privacy` to pathnames)
- Create: `components/marketing/LegalDoc.tsx`
- Create: `app/[locale]/(marketing)/privacy/page.tsx`
- Modify: `messages/sk.json` (add `legal.privacy.*`)

**Why:** GDPR Art. 13 requires that we inform users about data processing at the point of collection (the contact form). A linked Privacy Policy is the standard mechanism. Slovak users must be able to read it in Slovak. Other locales follow in Task 9.

- [ ] **Step 1: Add `/privacy` to `routing.pathnames`**

In `lib/i18n/routing.ts`, inside the `pathnames` object, add (place between `/contact` and the portal block):

```ts
    "/privacy": {
      sk: "/ochrana-osobnych-udajov",
      en: "/privacy-policy",
      de: "/datenschutz",
      fr: "/politique-de-confidentialite",
      sv: "/integritetspolicy",
    },
    "/cookies": {
      sk: "/cookies",
      en: "/cookies",
      de: "/cookies",
      fr: "/cookies",
      sv: "/cookies",
    },
```

(Adding both at once even though Task 4 needs `/cookies` — one routing edit is cleaner.)

- [ ] **Step 2: Create `components/marketing/LegalDoc.tsx`**

```tsx
import { Container } from "@/components/ui/Container";

// Shared layout for long-form legal pages (Privacy, Cookies).
// Children are a series of <section>s; this provides typography + spacing.
export function LegalDoc({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="py-16 md:py-24">
      <Container className="max-w-3xl">
        <div className="flex items-center gap-3 mb-5">
          <span className="h-px w-10 bg-[var(--color-rule)]" />
          <span className="eyebrow text-[var(--color-fjord)]">{eyebrow}</span>
        </div>
        <h1
          className="font-display text-[2.5rem] md:text-[3.5rem] leading-[1.05] tracking-[-0.03em] text-[var(--color-ink)]"
          style={{ fontWeight: 700 }}
        >
          {title}
        </h1>
        <p className="mt-4 text-[0.875rem] text-[var(--color-slate)]">{updated}</p>
        <div className="mt-12 space-y-10 text-[1rem] leading-[1.7] text-[var(--color-ink-2)]">
          {children}
        </div>
      </Container>
    </article>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-[1.375rem] md:text-[1.625rem] tracking-[-0.01em] text-[var(--color-ink)]" style={{ fontWeight: 700 }}>
        {heading}
      </h2>
      <div className="space-y-3 whitespace-pre-line">{children}</div>
    </section>
  );
}
```

- [ ] **Step 3: Add SK Privacy Policy content to `messages/sk.json`**

Add a top-level `legal` namespace (sibling of `home`, `services`, `about`, `contact`, `notFound`):

```json
"legal": {
  "privacy": {
    "meta": {
      "title": "Ochrana osobných údajov · Quantum Sphere",
      "description": "Ako spracúvame osobné údaje návštevníkov a klientov."
    },
    "eyebrow": "Právne informácie",
    "title": "Ochrana osobných údajov",
    "updated": "Aktualizované 26. mája 2026",
    "controller": {
      "heading": "1. Prevádzkovateľ",
      "body": "Prevádzkovateľom v zmysle čl. 4 ods. 7 GDPR je:\n\nQuantum Sphere s.r.o.\nMlynské Nivy 5, 821 09 Bratislava, Slovenská republika\nIČO: __ICO_PLACEHOLDER__\nDIČ: SK2120988117\nZapísaná v OR __OR_SUD_PLACEHOLDER__, oddiel __OR_ODDIEL_PLACEHOLDER__, vložka č. __OR_VLOZKA_PLACEHOLDER__\nKontakt: rfp@quantum-sphere.eu · +421 2 5556 0188"
    },
    "scope": {
      "heading": "2. Aké údaje spracúvame",
      "body": "Spracúvame iba údaje, ktoré nám sami poskytnete cez kontaktný formulár alebo e-mailom:\n\n• Meno a priezvisko\n• E-mailová adresa\n• Telefónne číslo (voliteľne)\n• Názov spoločnosti (voliteľne)\n• Typ služby, o ktorú máte záujem\n• Obsah vašej správy\n\nPri návšteve webu spracúvame technické údaje (IP adresa, typ prehliadača, čas návštevy) v rozsahu nevyhnutnom na bezpečnú prevádzku služby."
    },
    "purpose": {
      "heading": "3. Účel a právny základ",
      "body": "Údaje z kontaktného formulára spracúvame na účely:\n\n• Vybavenie vášho dopytu a komunikácia o ňom — právny základ: čl. 6 ods. 1 písm. b GDPR (predzmluvné vzťahy a plnenie zmluvy).\n• Vedenie evidencie obchodnej korešpondencie — právny základ: čl. 6 ods. 1 písm. f GDPR (oprávnený záujem prevádzkovateľa).\n\nMarketingové cookies (analytika) spracúvame výlučne na základe vášho výslovného súhlasu — čl. 6 ods. 1 písm. a GDPR — udeleného cez cookie banner. Súhlas môžete kedykoľvek odvolať."
    },
    "retention": {
      "heading": "4. Doba uchovávania",
      "body": "Údaje z kontaktného formulára uchovávame po dobu vybavovania dopytu a následne najviac 3 roky od posledného kontaktu (oprávnený záujem — evidencia korešpondencie). Pri uzatvorení obchodného vzťahu sa táto doba predlžuje podľa zákonných lehôt (najmä účtovné a daňové predpisy).\n\nTechnické logy o návšteve webu uchovávame najviac 30 dní."
    },
    "recipients": {
      "heading": "5. Príjemcovia a sprostredkovatelia",
      "body": "Vaše údaje sprístupňujeme len týmto kategóriám príjemcov, a to v rozsahu nevyhnutnom na účel:\n\n• Vercel Inc. (USA) — hosting webu a doručovacia infraštruktúra. Prenos údajov do USA je zabezpečený štandardnými zmluvnými doložkami (SCC) podľa čl. 46 GDPR.\n• Supabase (EÚ) — databázové úložisko správ z formulára.\n• Poskytovateľ SMTP (Slovensko/EÚ) — doručenie e-mailovej notifikácie o novom dopyte.\n• PostHog Inc. (USA) — anonymizovaná analytika návštevnosti, výlučne ak udelíte súhlas. Prenos do USA krytý SCC.\n\nVaše údaje nepredávame ani neposkytujeme tretím stranám na marketingové účely."
    },
    "rights": {
      "heading": "6. Vaše práva",
      "body": "Podľa GDPR máte právo:\n\n• na prístup k vašim údajom (čl. 15),\n• na opravu nesprávnych údajov (čl. 16),\n• na vymazanie údajov (čl. 17), ak nie sú potrebné na účel, na ktorý boli zhromaždené,\n• na obmedzenie spracovania (čl. 18),\n• na prenosnosť údajov (čl. 20),\n• namietať proti spracovaniu na základe oprávneného záujmu (čl. 21),\n• kedykoľvek odvolať súhlas s analytickými cookies (čl. 7 ods. 3) — odvolanie nemá spätné účinky.\n\nSvoje práva môžete uplatniť e-mailom na rfp@quantum-sphere.eu. Odpovieme do 30 dní.\n\nMáte tiež právo podať sťažnosť dozornému orgánu — Úrad na ochranu osobných údajov Slovenskej republiky, Hraničná 12, 820 07 Bratislava (www.dataprotection.gov.sk)."
    },
    "cookies": {
      "heading": "7. Cookies a analytika",
      "body": "Web používa minimum cookies. Detaily nájdete v samostatnom dokumente Cookies."
    },
    "changes": {
      "heading": "8. Zmeny tohto dokumentu",
      "body": "Vyhradzujeme si právo aktualizovať tieto zásady. Dátum poslednej aktualizácie je uvedený v hlavičke dokumentu. Pri zmene s podstatným dopadom na vás vás budeme primerane informovať."
    }
  }
}
```

> Order matters in JSON only for human readers. Drop the `legal` block in alphabetically (before `nav`) or wherever fits the existing style — next-intl loads the whole tree.

- [ ] **Step 4: Create `app/[locale]/(marketing)/privacy/page.tsx`**

```tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDoc, LegalSection } from "@/components/marketing/LegalDoc";
import { alternatesForPathname } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.privacy.meta" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: alternatesForPathname("/privacy", locale),
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.privacy" });

  const sections = ["controller", "scope", "purpose", "retention", "recipients", "rights", "cookies", "changes"] as const;

  return (
    <LegalDoc eyebrow={t("eyebrow")} title={t("title")} updated={t("updated")}>
      {sections.map((s) => (
        <LegalSection key={s} heading={t(`${s}.heading`)}>
          {t(`${s}.body`)}
        </LegalSection>
      ))}
    </LegalDoc>
  );
}
```

- [ ] **Step 5: Build + smoke-test**

```bash
npm run build
npm run start &
curl -sI http://localhost:3000/sk/ochrana-osobnych-udajov
# Expected: 200
# Open in browser, verify all 8 sections render with the SK content.
# Verify the IBAN does not appear anywhere on this page (sanity).
# Verify the "Ochrana osobných údajov" footer link now resolves (no 404).
```

- [ ] **Step 6: Commit**

```bash
git add lib/i18n/routing.ts components/marketing/LegalDoc.tsx \
  app/[locale]/\(marketing\)/privacy/page.tsx messages/sk.json
git commit -m "feat(legal): add Privacy Policy page (SK)

GDPR Art. 13 requires informing users about processing at point of
collection (the contact form). Adds a localized /privacy route with
full Slovak Privacy Policy content covering controller identity,
scope of processing, legal basis, retention, recipients (incl. US
sub-processors with SCC), and data-subject rights. EN/DE/FR/SV
translations land in Task 9."
```

---

### Task 4: Cookies Policy page (SK content + route)

**Files:**
- Create: `app/[locale]/(marketing)/cookies/page.tsx`
- Modify: `messages/sk.json` (add `legal.cookies.*`)

**Why:** ePrivacy + § 109 zákona č. 452/2021 Z.z. o elektronických komunikáciách require a cookie information document and active opt-in for non-essential cookies. Routing for `/cookies` was already added in Task 3 Step 1.

- [ ] **Step 1: Add SK Cookies Policy content to `messages/sk.json`**

Add inside the existing `legal` namespace, sibling of `privacy`:

```json
"cookies": {
  "meta": {
    "title": "Cookies · Quantum Sphere",
    "description": "Aké cookies používame a ako spravovať váš súhlas."
  },
  "eyebrow": "Právne informácie",
  "title": "Cookies",
  "updated": "Aktualizované 26. mája 2026",
  "intro": {
    "heading": "Čo sú cookies",
    "body": "Cookies sú malé textové súbory, ktoré web ukladá vo vašom prehliadači. Slúžia na fungovanie webu (napríklad zapamätanie vášho jazyka) alebo na meranie návštevnosti."
  },
  "necessary": {
    "heading": "Nevyhnutné cookies",
    "body": "Tieto cookies sú potrebné pre základné fungovanie webu a nepotrebujú váš súhlas:\n\n• NEXT_LOCALE — uchováva vami zvolený jazyk (platnosť 1 rok).\n• authjs.session-token / authjs.csrf-token — prihlásenie do klientskeho portálu (platí počas trvania prihlásenia).\n\nBez týchto cookies web nebude fungovať správne."
  },
  "analytics": {
    "heading": "Analytické cookies (so súhlasom)",
    "body": "Ak udelíte súhlas, ukladáme cookies služby PostHog na anonymizované meranie návštevnosti (počet návštev, najčastejšie stránky, zdroj návštev). Údaje sú agregované, neslúžia na profilovanie ani reklamu.\n\n• ph_phc_* — identifikátor návštevy a stav PostHog SDK (platnosť do 1 roka).\n• Spracovateľ: PostHog Inc., USA — prenos krytý štandardnými zmluvnými doložkami.\n\nSúhlas môžete kedykoľvek odvolať — kliknite na odkaz „Spravovať cookies\" v päte alebo vymažte cookies vo vašom prehliadači."
  },
  "manage": {
    "heading": "Ako spravovať súhlas",
    "body": "Pri prvej návšteve webu vám zobrazíme cookie banner. Tam môžete súhlas s analytikou udeliť alebo odmietnuť. Vaše rozhodnutie si pamätáme cez cookie „qs_consent\" (platnosť 6 mesiacov).\n\nSúhlas môžete kedykoľvek zmeniť — buď cez tlačidlo nižšie, alebo vymazaním cookies vo vašom prehliadači."
  },
  "thirdParty": {
    "heading": "Cookies tretích strán",
    "body": "Web nepoužíva reklamné cookies, cookies sociálnych sietí ani trackery tretích strán mimo vyššie uvedeného PostHogu."
  },
  "manageButton": "Spravovať súhlas s cookies"
}
```

- [ ] **Step 2: Create `app/[locale]/(marketing)/cookies/page.tsx`**

```tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDoc, LegalSection } from "@/components/marketing/LegalDoc";
import { ConsentResetButton } from "@/components/marketing/ConsentResetButton";
import { alternatesForPathname } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.cookies.meta" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: alternatesForPathname("/cookies", locale),
  };
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.cookies" });

  const sections = ["intro", "necessary", "analytics", "manage", "thirdParty"] as const;

  return (
    <LegalDoc eyebrow={t("eyebrow")} title={t("title")} updated={t("updated")}>
      {sections.map((s) => (
        <LegalSection key={s} heading={t(`${s}.heading`)}>
          {t(`${s}.body`)}
        </LegalSection>
      ))}
      <div className="pt-4">
        <ConsentResetButton label={t("manageButton")} />
      </div>
    </LegalDoc>
  );
}
```

> `ConsentResetButton` is created in Task 5.

- [ ] **Step 3: Build + smoke-test**

```bash
npm run build
npm run start &
curl -sI http://localhost:3000/sk/cookies
# Expected: 200
# In browser: open /sk/cookies, verify all 5 sections render. The "Spravovať
# súhlas" button will be wired in Task 5 — for now Task 5 doesn't exist yet,
# so this step's full render needs ConsentResetButton to already exist.
# IF you're executing tasks strictly in order, defer Step 3 verification of
# the button until Task 5 lands.
```

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/\(marketing\)/cookies/page.tsx messages/sk.json
git commit -m "feat(legal): add Cookies Policy page (SK)

ePrivacy + § 109 zák. č. 452/2021 require a cookie information document
and active opt-in for non-essential cookies. Lists strictly-necessary
cookies (NEXT_LOCALE, auth session) and analytics cookies (PostHog,
opt-in). EN/DE/FR/SV translations land in Task 9."
```

---

### Task 5: Cookie consent banner + state helper

**Files:**
- Create: `lib/consent.ts`
- Create: `lib/actions/consent.ts`
- Create: `components/marketing/CookieConsent.tsx`
- Create: `components/marketing/ConsentResetButton.tsx`
- Modify: `app/[locale]/layout.tsx`
- Modify: `messages/sk.json` (add `consent.*`)

**Why:** PostHog is currently initialized unconditionally whenever `NEXT_PUBLIC_POSTHOG_KEY` is set (see `components/analytics/PostHogProvider.tsx:14-21`). ePrivacy + GDPR require active opt-in *before* analytics cookies are dropped. Banner returns a tri-state cookie (`granted` / `denied` / unset). Default = unset = analytics off.

- [ ] **Step 1: Add `consent.*` strings to `messages/sk.json`**

Top-level namespace, sibling of `legal`:

```json
"consent": {
  "title": "Cookies & súkromie",
  "body": "Používame nevyhnutné cookies pre základné fungovanie webu. So súhlasom používame aj anonymizovanú analytiku (PostHog).",
  "learnMore": "Viac informácií",
  "accept": "Prijať analytiku",
  "decline": "Iba nevyhnutné",
  "manageTitle": "Spravovať súhlas",
  "currentGranted": "Analytika je aktuálne povolená.",
  "currentDenied": "Analytika je aktuálne zakázaná.",
  "currentUnset": "Súhlas ešte nebol udelený.",
  "revoke": "Zrušiť súhlas",
  "regrant": "Povoliť analytiku"
}
```

- [ ] **Step 2: Create `lib/consent.ts`**

```ts
// Client-side read of the consent cookie. The cookie is named `qs_consent`
// with values "granted" | "denied". Absence = unset (banner shows).
export type ConsentState = "granted" | "denied" | "unset";

export const CONSENT_COOKIE = "qs_consent";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 6 months

export function readConsentFromDocument(): ConsentState {
  if (typeof document === "undefined") return "unset";
  const m = document.cookie.match(/(?:^|;\s*)qs_consent=([^;]+)/);
  if (!m) return "unset";
  return m[1] === "granted" ? "granted" : m[1] === "denied" ? "denied" : "unset";
}

// Fires whenever the document.cookie value for qs_consent changes.
export const CONSENT_EVENT = "qs:consent-changed";
```

- [ ] **Step 3: Create `lib/actions/consent.ts`**

```ts
"use server";

import { cookies } from "next/headers";
import { CONSENT_COOKIE, CONSENT_MAX_AGE, type ConsentState } from "@/lib/consent";

export async function setConsent(value: Exclude<ConsentState, "unset">) {
  const store = await cookies();
  store.set(CONSENT_COOKIE, value, {
    maxAge: CONSENT_MAX_AGE,
    path: "/",
    sameSite: "lax",
    // Not HttpOnly — we need to read it client-side to gate PostHog init.
  });
}

export async function revokeConsent() {
  const store = await cookies();
  store.delete(CONSENT_COOKIE);
}
```

> The Next.js 16 `cookies()` API returns a Promise in App Router server actions — verify against `node_modules/next/dist/docs/` if anything looks off (AGENTS.md guidance).

- [ ] **Step 4: Create `components/marketing/CookieConsent.tsx`**

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/Button";
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
      // Update local + notify same-tab listeners; PostHogProvider listens.
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
```

- [ ] **Step 5: Create `components/marketing/ConsentResetButton.tsx`**

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonClass } from "@/components/ui/Button";
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
```

- [ ] **Step 6: Mount the banner in `app/[locale]/layout.tsx`**

Edit the layout to import + render the banner inside `NextIntlClientProvider`:

```tsx
import { CookieConsent } from "@/components/marketing/CookieConsent";
// … existing imports …

export default async function LocaleLayout({ children, params }: { … }) {
  // … existing body …
  return (
    <html lang={locale} suppressHydrationWarning className={jakarta.variable}>
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <PostHogProvider locale={locale}>{children}</PostHogProvider>
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Banner outside `<PostHogProvider>` deliberately — banner state determines whether PostHog initializes; the provider reads from cookie + event, not React state.

- [ ] **Step 7: Build + smoke-test**

```bash
npm run build
npm run start &
# Clear cookies for localhost:3000 in your browser, visit /sk
# Expected: banner appears at bottom-right
# Click "Iba nevyhnutné" → banner disappears, cookie qs_consent=denied set
# Reload → banner does not re-appear
# Visit /sk/cookies → ConsentResetButton shows "Analytika je aktuálne zakázaná" + "Povoliť analytiku"
# Click "Povoliť analytiku" → text flips to "Analytika je aktuálne povolená"
# Reload /sk → banner still hidden (cookie present)
# Visit /sk/cookies → status flipped to granted
```

- [ ] **Step 8: Commit**

```bash
git add lib/consent.ts lib/actions/consent.ts \
  components/marketing/CookieConsent.tsx \
  components/marketing/ConsentResetButton.tsx \
  app/[locale]/layout.tsx messages/sk.json
git commit -m "feat(legal): add cookie consent banner + consent management

ePrivacy / GDPR require active opt-in before analytics cookies. Adds:
- /lib/consent.ts — client cookie reader + change event name
- /lib/actions/consent.ts — server actions to set/revoke consent
- CookieConsent.tsx — sticky banner shown when state is unset
- ConsentResetButton.tsx — manage consent from /cookies page
- mounted in [locale]/layout.tsx

Default = unset = analytics off. PostHog gating lands in Task 6."
```

---

### Task 6: Wire PostHog behind the consent cookie

**Files:**
- Modify: `components/analytics/PostHogProvider.tsx`

**Why:** Until this task, PostHog initializes whenever `NEXT_PUBLIC_POSTHOG_KEY` is set — irrespective of consent. After this task, init waits for `qs_consent=granted` and re-evaluates when the user flips consent.

- [ ] **Step 1: Edit `components/analytics/PostHogProvider.tsx`**

Replace the file body with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { readConsentFromDocument, CONSENT_EVENT, type ConsentState } from "@/lib/consent";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let initialized = false;
function ensureInit() {
  if (initialized || !KEY || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

function shutdown() {
  if (!initialized) return;
  posthog.opt_out_capturing();
  // posthog-js has no full "teardown" — opt_out_capturing stops events and
  // clears the user's distinct_id from new captures. Existing cookies are
  // wiped on the next reload by posthog.reset(); call it for good measure.
  try {
    posthog.reset();
  } catch {
    /* no-op on SSR or stale state */
  }
}

export function PostHogProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [consent, setConsentState] = useState<ConsentState>("unset");

  useEffect(() => {
    const sync = () => setConsentState(readConsentFromDocument());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    if (consent === "granted") {
      ensureInit();
      if (initialized) posthog.opt_in_capturing();
    } else if (consent === "denied" && initialized) {
      shutdown();
    }
  }, [consent]);

  useEffect(() => {
    if (!KEY || !initialized || consent !== "granted") return;
    posthog.capture("$pageview", { locale });
  }, [pathname, locale, consent]);

  return <>{children}</>;
}
```

- [ ] **Step 2: Build + smoke-test**

```bash
npm run build
npm run start &
# In your browser DevTools → Network, filter for "posthog" or "i.posthog.com"
# Clear cookies, visit /sk. Banner appears.
# 1. Click "Iba nevyhnutné" (denied). Click around the site. → 0 PostHog requests.
# 2. Visit /sk/cookies, flip to granted. Click around. → /e/ POST appears (200 expected).
# 3. Flip back to "Zrušiť súhlas" (revoke). Click around. → 0 new PostHog requests.
```

- [ ] **Step 3: Commit**

```bash
git add components/analytics/PostHogProvider.tsx
git commit -m "feat(analytics): gate PostHog init behind cookie consent

Was: PostHog initialized unconditionally whenever the env key was set.
Now: init waits for qs_consent=granted; opt_out + reset when consent is
denied or revoked; re-init when user re-grants. Listens to the
CONSENT_EVENT so flipping consent in the same tab applies immediately.

Brings the site into ePrivacy / GDPR compliance — analytics cookies
only after active opt-in."
```

---

### Task 7: GDPR checkbox on the contact form (schema + UI + i18n)

**Files:**
- Modify: `lib/contact-schema.ts`
- Modify: `lib/contact-schema.test.ts`
- Modify: `app/[locale]/(marketing)/contact/ContactForm.tsx`
- Modify: `messages/sk.json` (`contact.form.gdpr*`)

**Why:** GDPR Art. 13 information must be presented at point of collection, and where consent is the legal basis we need an unticked, separate, explicit opt-in. We're not relying on consent (legal basis = predzmluvné vzťahy per čl. 6 ods. 1 písm. b), but we still need a clear acknowledgment + visible Privacy Policy link to satisfy the information duty. Implement as a required checkbox that gates submit.

- [ ] **Step 1: Write the failing schema test**

Edit `lib/contact-schema.test.ts`. Find the existing tests (the current file passes 6/6). Append two new tests:

```ts
import { describe, it, expect } from "vitest";
import { contactSchema } from "./contact-schema";

// … existing imports + tests …

describe("contactSchema GDPR consent", () => {
  const base = {
    name: "Test",
    email: "test@example.com",
    serviceType: "solar" as const,
    message: "hello",
    gdprConsent: true,
  };

  it("rejects when gdprConsent is missing", () => {
    // @ts-expect-error — exercising the missing-field case
    const { gdprConsent: _omit, ...rest } = base;
    expect(contactSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when gdprConsent is false", () => {
    expect(contactSchema.safeParse({ ...base, gdprConsent: false }).success).toBe(false);
  });

  it("accepts when gdprConsent is true", () => {
    expect(contactSchema.safeParse(base).success).toBe(true);
  });
});

describe("contactSchema honeypot", () => {
  const base = {
    name: "Test",
    email: "test@example.com",
    serviceType: "solar" as const,
    message: "hello",
    gdprConsent: true,
  };

  it("accepts when _hp is omitted", () => {
    expect(contactSchema.safeParse(base).success).toBe(true);
  });

  it("accepts when _hp is empty string", () => {
    expect(contactSchema.safeParse({ ...base, _hp: "" }).success).toBe(true);
  });

  it("rejects when _hp has any content", () => {
    expect(contactSchema.safeParse({ ...base, _hp: "x" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

```bash
npm test -- contact-schema
# Expected: the new tests fail because `gdprConsent` and `_hp` are not yet
# in the schema; existing 6/6 should still pass.
```

- [ ] **Step 3: Update `lib/contact-schema.ts`**

```ts
import { z } from "zod";

export const SERVICE_TYPES = [
  "solar",
  "electrical",
  "drywall",
  "masonry",
  "roofing",
  "other",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(200).optional(),
  serviceType: z.enum(SERVICE_TYPES, { message: "Choose a service" }),
  message: z.string().trim().min(1, "Message is required").max(4000),
  gdprConsent: z.literal(true, { message: "Consent required" }),
  // Honeypot — humans never see/fill it, bots usually fill every field.
  // Schema enforces it must be empty (or absent).
  _hp: z.string().max(0).optional(),
});

export type ContactPayload = z.infer<typeof contactSchema>;
```

- [ ] **Step 4: Re-run tests, confirm green**

```bash
npm test -- contact-schema
# Expected: all 11 tests pass (existing 6 + new 5).
```

- [ ] **Step 5: Extend `messages/sk.json` — `contact.form` namespace**

Add three keys (keep all existing keys intact):

```json
"contact": {
  "...": "...",
  "form": {
    "name": "Meno",
    "email": "Email",
    "phone": "Telefón",
    "company": "Spoločnosť",
    "serviceType": "Typ služby",
    "serviceSelect": "Vyberte službu",
    "serviceOther": "Iná / všeobecný dopyt",
    "message": "Správa",
    "submit": "Odoslať",
    "success": "...existing...",
    "error": "...existing...",
    "gdprLabel": "Súhlasím so spracovaním osobných údajov v zmysle Zásad ochrany osobných údajov.",
    "gdprLinkText": "Zásady ochrany osobných údajov",
    "gdprRequired": "Pre odoslanie formulára je nutné udeliť súhlas."
  }
}
```

- [ ] **Step 6: Update `app/[locale]/(marketing)/contact/ContactForm.tsx`**

Two changes: (a) add a hidden honeypot input, (b) add the GDPR checkbox with inline link to `/privacy`.

Inside `<form>`, immediately before `<div className="md:col-span-2 pt-2">` (the submit button container), insert:

```tsx
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
      type="checkbox"
      name="gdprConsent"
      required
      aria-invalid={Boolean(errors.gdprConsent)}
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
    <p className="mt-1.5 text-xs text-[var(--color-ember-2)]" role="alert">
      {tf("gdprRequired")}
    </p>
  )}
</div>
```

> The `replace(...).split(...).map(...)` dance lets translators reorder the link inline within the sentence. If you prefer cleaner i18n, use next-intl's `rich()` (see `node_modules/next-intl/dist/types/` for the API on this version); the string-split fallback works and is fewer key changes.

Also update the `payload` builder at the top of `onSubmit`:

```ts
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
```

- [ ] **Step 7: Build + smoke-test**

```bash
npm run build
npm run start &
# Visit /sk/kontakt, fill in name+email+service+message but leave checkbox unchecked.
# Click Submit → expected: native HTML5 "required" tooltip on the checkbox.
# Bypass the native required (uncheck in devtools → submit programmatically) → server returns 400.
# Check the checkbox, submit → success state.
# View page source: the honeypot input is present but invisible.
```

- [ ] **Step 8: Commit**

```bash
git add lib/contact-schema.ts lib/contact-schema.test.ts \
  app/[locale]/\(marketing\)/contact/ContactForm.tsx messages/sk.json
git commit -m "feat(contact): require GDPR consent + add honeypot

GDPR Art. 13 information duty at point of collection. Adds:
- gdprConsent: z.literal(true) — required checkbox with inline link
  to /privacy
- _hp honeypot — empty-only Zod field; bots that auto-fill every input
  fail validation client+server-side
- visual checkbox with localized label + privacy-policy link
- schema tests (5 new cases)

Legal basis for the form remains predzmluvné vzťahy (čl. 6 ods. 1 b),
not consent — checkbox is the acknowledgment that satisfies the
information duty."
```

---

### Task 8: Anti-spam — silently 200 the honeypot at the API

**Files:**
- Modify: `app/api/contact/route.ts`

**Why:** Zod already rejects a filled `_hp` (Task 7 schema). But a 400 response tells bots their payload was wrong; a silent 200 wastes their time and avoids tipping them off. Also lets us short-circuit before hitting Prisma + SMTP.

- [ ] **Step 1: Edit `app/api/contact/route.ts`**

Insert the honeypot check between the JSON parse and the schema validation:

```ts
import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/contact-schema";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendContactNotification } from "@/lib/mailer";

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

  // Honeypot: bots auto-fill every field; humans never see this one.
  // Quietly succeed without persisting — don't tell the bot why it failed.
  if (typeof body === "object" && body !== null && "_hp" in body) {
    const hp = (body as { _hp?: unknown })._hp;
    if (typeof hp === "string" && hp.length > 0) {
      return NextResponse.json({ ok: true });
    }
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { name, email, phone, company, serviceType, message } = parsed.data;

  await prisma.contactSubmission.create({
    data: {
      name,
      email,
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      serviceType,
      message,
    },
  });

  await sendContactNotification({ name, email, phone, company, serviceType, message }).catch(
    (err) => {
      console.error("Contact email notification failed:", err);
    },
  );

  return NextResponse.json({ ok: true });
}
```

> Note: we read `_hp` from the raw body **before** schema parse so the bot doesn't even see a validation error. The schema still enforces `_hp.length === 0` for any sneakily-injected client payload; the route just gets to fast-path the obvious case.

- [ ] **Step 2: Manual API test**

```bash
npm run start &
# Confirm honeypot path returns 200 without DB write:
curl -s -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Bot","email":"bot@x.com","serviceType":"solar","message":"spam","gdprConsent":true,"_hp":"http://bad.example.com"}'
# Expected: {"ok":true}
# Check DB locally — no new ContactSubmission row.

# Confirm a legit payload still works:
curl -s -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Real","email":"real@example.com","serviceType":"solar","message":"hi","gdprConsent":true}'
# Expected: {"ok":true} AND a row appears in ContactSubmission.
# Then clean up the test row.
```

- [ ] **Step 3: Commit**

```bash
git add app/api/contact/route.ts
git commit -m "feat(contact): silent honeypot at the API

When _hp is filled (only bots fill it), quietly return 200 without
hitting Prisma or SMTP. Avoids telling the bot why its payload failed
and saves DB/SMTP calls on every spam attempt. Legitimate clients are
unaffected — the Zod schema enforces the same empty rule as backup."
```

---

### Task 9: Translations (EN, DE, FR, SV)

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/de.json`
- Modify: `messages/fr.json`
- Modify: `messages/sv.json`

**Why:** SK is the source language in this codebase. Tasks 2–7 added new keys (`footer.legal/privacy/cookies/companyIdLabel/vatLabel/registrationLabel`, `legal.privacy.*`, `legal.cookies.*`, `consent.*`, `contact.form.gdprLabel/gdprLinkText/gdprRequired`). All four other locales need them. The existing pattern (used in Tasks 11/15/16 in `STATUS.md`) is to dispatch one subagent per language; the SK content is the source.

- [ ] **Step 1: Dispatch parallel translation subagents**

> If executing inline (no parallel agent dispatcher available), translate one locale at a time using the same prompt below.

Use the `superpowers:dispatching-parallel-agents` skill to send three subagents in a single message — one for EN, DE, FR, SV (four agents, in parallel, in one message). The prompt template:

```
Task: Translate new SK marketing keys to <LOCALE>.

Read: messages/sk.json — focus on the following key paths added today:
  - footer.legal, footer.privacy, footer.cookies, footer.companyIdLabel,
    footer.vatLabel, footer.registrationLabel
  - legal.privacy.*  (full subtree)
  - legal.cookies.*  (full subtree)
  - consent.*  (full subtree)
  - contact.form.gdprLabel, gdprLinkText, gdprRequired

Read the corresponding file (messages/<locale>.json) and ADD the same keys
under the same paths with translated values. Do NOT modify keys that
already exist with non-placeholder values. Preserve JSON formatting and
indentation (2 spaces).

Language guidance:
- EN: British English, B2B construction tone
- DE: formal "Sie", compound nouns where natural
- FR: formal "vous"
- SV: natural professional register

Critical:
- Keep ALL placeholder literals (__ICO_PLACEHOLDER__, __OR_SUD_PLACEHOLDER__,
  __OR_ODDIEL_PLACEHOLDER__, __OR_VLOZKA_PLACEHOLDER__) unchanged — they're
  substituted at runtime, not at translation.
- Keep the addresses, phone numbers, emails, VAT, and "Quantum Sphere s.r.o."
  verbatim across all locales (Slovak company identity).
- Adapt the reference to the Slovak supervisory authority ("Úrad na ochranu
  osobných údajov SR") consistently — do not translate the authority name;
  add a local-language explanation in parentheses if natural.
- Keep references to "GDPR", "PostHog", "Vercel", "Supabase", "SCC",
  "NEXT_LOCALE", "qs_consent", "authjs.session-token" verbatim.
- For "Aktualizované 26. mája 2026": localize the date format naturally.

Output: write directly into messages/<locale>.json (deep-merge, do NOT clobber
existing keys). Then run `node -e "JSON.parse(require('fs').readFileSync('messages/<locale>.json'))"`
to confirm it parses. Report key count delta.
```

- [ ] **Step 2: Verify schema parity**

```bash
node -e "
const sk = require('./messages/sk.json');
for (const loc of ['en','de','fr','sv']) {
  const m = require('./messages/' + loc + '.json');
  const flat = (o, p='') => Object.entries(o).flatMap(([k,v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flat(v, p+k+'.') : [p+k]
  );
  const sk_keys = new Set(flat(sk));
  const m_keys = new Set(flat(m));
  const missing = [...sk_keys].filter(k => !m_keys.has(k));
  const extra = [...m_keys].filter(k => !sk_keys.has(k));
  console.log(loc, 'missing:', missing.length, 'extra:', extra.length);
  if (missing.length) console.log('  missing keys:', missing);
}
"
# Expected: 0 missing across all 4 locales. Some "extra" keys are OK
# (English fallbacks may exist where SK was not added intentionally).
```

- [ ] **Step 3: Build + smoke-test each locale**

```bash
npm run build
npm run start &
for loc in en de fr sv; do
  echo "--- $loc ---"
  curl -sI http://localhost:3000/$loc/privacy-policy 2>/dev/null || \
  curl -sI http://localhost:3000/$loc/datenschutz 2>/dev/null || \
  curl -sI http://localhost:3000/$loc/politique-de-confidentialite 2>/dev/null || \
  curl -sI http://localhost:3000/$loc/integritetspolicy 2>/dev/null
done
# Expected: all 4 return 200 at the correct localized path.
# In browser: open one of /en/privacy-policy, /de/datenschutz, etc. —
# verify no untranslated SK strings leak through.
```

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/de.json messages/fr.json messages/sv.json
git commit -m "i18n: translate legal/consent/contact-gdpr keys (en, de, fr, sv)

Translated via 4 parallel subagents — Privacy Policy, Cookies Policy,
cookie consent banner, contact-form GDPR labels. Source = SK.
Schema parity verified: 0 missing keys across all 4 locales.
Placeholders (__ICO_*, __OR_*) preserved for runtime substitution."
```

---

### Task 10: Verify Solar `01###` rendering (likely a non-bug)

**Files:** none (verification only)

**Why:** David reported "01### Free site survey" on the Solar process section, with the number and heading visually merged. Reading `components/marketing/ServicePage.tsx:101-114`, the numeral is in a `<span class="numeral … block leading-none mb-3">` (block element, 12px bottom margin) followed by `<h3>`. There's no obvious CSS bug. Most likely the report came from a text-extraction tool where the `<h3>` rendered as Markdown `###`. Confirm in a real browser before treating it as a bug.

- [ ] **Step 1: Render Solar page**

```bash
npm run start &
# Open http://localhost:3000/sk/solarne-elektrarne in Chrome (NOT a headless
# text-extraction). Scroll to the "Ako prebieha realizácia" section.
```

- [ ] **Step 2: Inspect rendering**

Visually confirm that for each of the (up to 6) process steps:
- The grey numeral ("01", "02", ...) appears above
- A clear ~12px gap (`mb-3`)
- Then the bold step title
- No `###` characters, no visual merge

- [ ] **Step 3: Decide**

- If renders cleanly → close as "not a bug, text-extraction artifact"; no commit.
- If genuinely merged → file a follow-up plan item describing the actual CSS issue with a screenshot. Likely fixes would be `display: block` (already there), bumping `mb-3` to `mb-4`, or adding `mt-1` to the `<h3>`.

- [ ] **Step 4: (No commit unless an issue was found.)**

---

### Task 11: End-to-end production verification

**Files:** none (verification + STATUS update)

- [ ] **Step 1: Build, lint, test gate**

```bash
npm run build
npm run lint
npm test
# Expected: all green. Tests = previously 57/57 + 5 new in contact-schema = 62/62.
```

- [ ] **Step 2: Lighthouse re-run**

```bash
# With the production build still running on localhost:3000:
npx lighthouse http://localhost:3000/sk --quiet --chrome-flags="--headless=new" --output=html --output-path=./docs/implementation/LIGHTHOUSE-post-legal.html
# Open the report. Expected: Perf ≥95 / A11y 100 / BP 100 / SEO ≥92 (the 92
# is the localhost canonical-domain artifact documented in Task 22).
```

- [ ] **Step 3: Production deploy**

```bash
vercel --prod
# Wait for READY. Note the deployment URL.
```

- [ ] **Step 4: Live verification checklist**

Open `https://qs-webapp.vercel.app` (or `https://quantum-sphere.eu` if DNS is live) in a clean private window:

- `/` → 307 `/sk` (regardless of `Accept-Language`)
- `/sk` → 200. Cookie banner appears.
- Click "Iba nevyhnutné" → banner hides; PostHog network calls = 0.
- Footer: shows IČO, DIČ, "Zápis: Okresný súd …, Oddiel: Sro, Vložka č. …". **No IBAN**.
- Footer links to `/sk/ochrana-osobnych-udajov` and `/sk/cookies` work.
- `/sk/ochrana-osobnych-udajov` renders all 8 sections.
- `/sk/cookies` renders all 5 sections + "Spravovať súhlas" button.
- `/sk/kontakt`: checkbox present, link to `/sk/ochrana-osobnych-udajov` works, submit blocked without check.
- Submit a real-looking message → success state. Verify a row appears in Supabase `ContactSubmission` and SMTP notification arrives.
- Visit each of `/en`, `/de`, `/fr`, `/sv` and confirm the banner, footer, privacy/cookies, and contact-form labels are translated.

- [ ] **Step 5: Update STATUS.md**

Append a post-plan section to `docs/implementation/STATUS.md`:

```markdown
---

## Post-plan: 2026-05-26 legal-compliance

### LC1: Locale default → SK regardless of Accept-Language — ✅ Done
- `routing.localeDetection = false`. Verified `/` 307 → `/sk` for EN/DE Accept-Language headers.

### LC2: Footer — IBAN removed, IČO + OR added — ✅ Done
- `lib/content.ts` now carries structured `companyId` + `registration` fields; § 3a ObchZ identity row in footer; IBAN removed entirely.

### LC3: Privacy + Cookies pages — ✅ Done
- `/privacy` and `/cookies` localized across 5 locales (SK source, EN/DE/FR/SV via parallel subagents); links in footer.

### LC4: Cookie consent banner + PostHog gating — ✅ Done
- `qs_consent` tri-state cookie; banner default = unset = analytics off. PostHog now waits for `granted` before init, opts out on revoke.

### LC5: Contact form — GDPR checkbox + honeypot — ✅ Done
- Schema enforces `gdprConsent: literal(true)` + empty `_hp`. API silent-200s the honeypot. 5 new schema tests pass.

### LC6: SK process-step rendering — ✅ Verified (not a bug)
- "01### Free site survey" was a text-extraction artifact; real-browser render is clean.

**Items still requiring David's follow-up:**
- Native-speaker review of the SK Privacy + Cookies copy before campaign launch.
- Native-speaker review of EN/DE/FR/SV translations.
- Add `NEXT_PUBLIC_POSTHOG_KEY` revisit — confirm DPA signed with PostHog (they offer one) before campaign launch.
```

- [ ] **Step 6: Commit STATUS update**

```bash
git add docs/implementation/STATUS.md docs/implementation/LIGHTHOUSE-post-legal.html
git commit -m "docs: record 2026-05-26 legal-compliance plan complete"
```

- [ ] **Step 7: (Optional) push & PR**

The repository's existing pattern is direct-to-main with descriptive commits (see `git log`). Push to `main` if that matches David's workflow for this branch, otherwise open a PR.

---

## Self-Review

**Spec coverage** (cross-checked against the 🚨 Critical section of David's audit):
- ✅ GDPR checkbox on contact form → Task 7
- ✅ Privacy Policy page → Task 3
- ✅ Cookie banner + Cookie Policy → Tasks 4, 5, 6
- ✅ IČO + OR in footer (§ 3a ObchZ) → Task 2
- ✅ Remove IBAN → Task 2
- ✅ SK as the default landing (root cause of "web je celý v angličtine") → Task 1
- ✅ Anti-spam honeypot → Tasks 7, 8
- ✅ Solar `01###` verification → Task 10

**Not in this plan** (intentionally — separate work):
- LocalBusiness/Organization JSON-LD schema
- Photos, references, certificates content
- About page expansion
- Blog
- info@/hello@ email, Google Maps embed, opening hours, mobile contact
- Sticky CTA, WhatsApp/Viber, social links
- Service-specific quote forms
- Localized landing pages for cities/regions
- Slogan consistency, final-CTA copy polish
- Client portal cross-promo, FAQ expansion, video, favicon audit

Those should go into a separate "trust + content" plan after legal compliance ships.

**Placeholder scan:** all placeholders are explicitly marked `__ICO_PLACEHOLDER__` / `__OR_*_PLACEHOLDER__` and gated by the Pre-flight section. No "TBD", "TODO", or vague-instruction steps.

**Type consistency:** `ConsentState` type is defined once in `lib/consent.ts` and imported by both `CookieConsent.tsx` and `ConsentResetButton.tsx` and `PostHogProvider.tsx`. The `CONSENT_EVENT` string constant is the single source of truth for the same-tab change notification. Schema field names (`gdprConsent`, `_hp`) match between `contact-schema.ts`, `ContactForm.tsx`, and `route.ts`.

---
