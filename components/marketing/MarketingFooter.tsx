import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { SERVICES } from "@/lib/services";
import { FOOTER } from "@/lib/content";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

const footerLinkCls =
  "text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors";

export function MarketingFooter() {
  const t = useTranslations("nav");
  const tf = useTranslations("footer");
  const tServices = useTranslations("services");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
      <Container className="pt-20 pb-14">
        <div className="grid gap-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 text-[0.9375rem] text-[var(--color-slate)] max-w-sm leading-[1.6]">
              {tf("tagline")}
            </p>
          </div>

          <FooterCol title={t("services")}>
            <ul className="space-y-2.5 text-[0.875rem]">
              {SERVICES.map(({ slug, internalPath }) => (
                <li key={slug}>
                  <Link href={internalPath} className={footerLinkCls}>
                    {tServices(`${slug}.name`)}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterCol>

          <FooterCol title={tf("company")}>
            <ul className="space-y-2.5 text-[0.875rem]">
              <li>
                <Link href="/" className={footerLinkCls}>
                  {t("home")}
                </Link>
              </li>
              <li>
                <Link href="/about" className={footerLinkCls}>
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className={footerLinkCls}>
                  {t("contact")}
                </Link>
              </li>
              <li>
                <Link href="/login" className={footerLinkCls}>
                  {t("portal")}
                </Link>
              </li>
            </ul>
          </FooterCol>

          <FooterCol title={t("contact")}>
            <ul className="space-y-2.5 text-[0.875rem] text-[var(--color-slate)] leading-[1.5]">
              {FOOTER.address.split(" · ").map((line, i) => (
                <li key={i}>{line}</li>
              ))}
              <li>
                <a
                  href={`tel:${FOOTER.phone.replace(/\s/g, "")}`}
                  className="hover:text-[var(--color-ink)] transition-colors"
                >
                  {FOOTER.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${FOOTER.email}`}
                  className="hover:text-[var(--color-ink)] transition-colors"
                >
                  {FOOTER.email}
                </a>
              </li>
            </ul>
          </FooterCol>
        </div>
      </Container>

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
            {/* @ts-expect-error -- /privacy not yet in routing.pathnames; remove after Task 3 */}
            <Link href="/privacy" className="hover:text-[var(--color-ink)] transition-colors">
              {tf("privacy")}
            </Link>
            {/* @ts-expect-error -- /cookies not yet in routing.pathnames; remove after Task 3 */}
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
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="eyebrow mb-4 text-[var(--color-ink)]">{title}</div>
      {children}
    </div>
  );
}
