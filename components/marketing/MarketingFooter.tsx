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

      <Container className="py-6 border-t border-[var(--color-rule)] flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--color-mist)] font-mono">
        <div>
          © {year} Quantum Sphere s.r.o. — {tf("rights")}
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline normal-case tracking-normal">{FOOTER.vat}</span>
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
