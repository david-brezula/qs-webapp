"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Menu, X, LogIn, Building2, ChevronDown, KeyRound } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/Button";
import { SERVICES } from "@/lib/services";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

const navLinkCls =
  "text-[0.8125rem] text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors";
const mobileLinkCls =
  "py-2 text-base text-[var(--color-slate)] hover:text-[var(--color-ink)]";

// Links to the portal. In production (NEXT_PUBLIC_APP_URL set) it points straight
// at the portal host; otherwise a same-host locale-aware link (dev/preview).
function PortalLink({
  path = "/login",
  className,
  onClick,
  children,
}: {
  path?: string;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  // Marketing -> portal is a cross-area navigation (in production a different
  // host via NEXT_PUBLIC_APP_URL), so use a plain locale-prefixed anchor rather
  // than the typed next-intl Link (portal slugs aren't localized pathnames).
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return (
    <a href={`${base}/${locale}${path}`} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

export function MarketingHeader() {
  const t = useTranslations("nav");
  const tServices = useTranslations("services");
  const tCommon = useTranslations("common");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (servicesRef.current && !servicesRef.current.contains(target)) {
        setServicesOpen(false);
      }
      if (loginRef.current && !loginRef.current.contains(target)) {
        setLoginOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--color-paper)]/85 backdrop-blur-md border-b border-[var(--color-rule)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <Container className="flex items-center justify-between py-5">
        <Logo />

        {/* Desktop nav — tablets keep the hamburger to avoid overflow.
            No "Home" link: the logo already navigates home. */}
        <nav className="hidden lg:flex items-center gap-9">
          <div
            ref={servicesRef}
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              aria-expanded={servicesOpen}
              className={`${navLinkCls} inline-flex items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-fjord)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]`}
              onClick={() => setServicesOpen((v) => !v)}
            >
              {t("services")}
              <ChevronDown
                size={13}
                strokeWidth={1.5}
                className={`transition-transform ${servicesOpen ? "rotate-180" : ""}`}
              />
            </button>
            {servicesOpen && (
              <div className="absolute left-0 top-full pt-3">
                <ul className="min-w-[17rem] rounded-[var(--radius-feature)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-2 shadow-[var(--shadow-float)]">
                  {SERVICES.map(({ slug, internalPath, icon: Icon }) => (
                    <li key={slug}>
                      <Link
                        href={internalPath}
                        className="flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2 text-[0.875rem] text-[var(--color-slate)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-card)] bg-[var(--color-paper-2)]">
                          <Icon size={16} strokeWidth={1.75} className="text-[var(--color-fjord)]" />
                        </span>
                        {tServices(`${slug}.name`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Link href="/work" className={navLinkCls}>
            {t("work")}
          </Link>
          <Link href="/about" className={navLinkCls}>
            {t("about")}
          </Link>
          <Link href="/careers" className={navLinkCls}>
            {t("careers")}
          </Link>
          {/* "Contact" lives only as the primary CTA button on the right. */}
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          <LanguageSwitcher />

          {/* Sign-in dropdown — collapses the client zone + work portal into a
              single compact trigger, mirroring the Services menu pattern. */}
          <div
            ref={loginRef}
            className="relative"
            onMouseEnter={() => setLoginOpen(true)}
            onMouseLeave={() => setLoginOpen(false)}
          >
            <button
              type="button"
              aria-expanded={loginOpen}
              className={`${navLinkCls} inline-flex items-center gap-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-fjord)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]`}
              onClick={() => setLoginOpen((v) => !v)}
            >
              <LogIn size={14} strokeWidth={1.5} />
              {t("signIn")}
              <ChevronDown
                size={13}
                strokeWidth={1.5}
                className={`transition-transform ${loginOpen ? "rotate-180" : ""}`}
              />
            </button>
            {loginOpen && (
              <div className="absolute right-0 top-full pt-3">
                <ul className="min-w-[16.5rem] rounded-[var(--radius-feature)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-2 shadow-[var(--shadow-float)]">
                  <li>
                    <PortalLink
                      path="/portal"
                      onClick={() => setLoginOpen(false)}
                      className="flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2.5 transition-colors hover:bg-[var(--color-canvas)]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-card)] bg-[var(--color-paper-2)]">
                        <Building2 size={17} strokeWidth={1.75} className="text-[var(--color-fjord)]" />
                      </span>
                      <span className="flex flex-col leading-tight">
                        <span className="text-[0.875rem] text-[var(--color-ink)]">{t("clientPortal")}</span>
                        <span className="text-[0.75rem] text-[var(--color-mist)]">{t("clientPortalHint")}</span>
                      </span>
                    </PortalLink>
                  </li>
                  <li aria-hidden className="my-1 border-t border-[var(--color-rule)]" />
                  <li>
                    <PortalLink
                      onClick={() => setLoginOpen(false)}
                      className="flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2.5 transition-colors hover:bg-[var(--color-canvas)]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-card)] bg-[var(--color-paper-2)]">
                        <KeyRound size={17} strokeWidth={1.75} className="text-[var(--color-fjord)]" />
                      </span>
                      <span className="flex flex-col leading-tight">
                        <span className="text-[0.875rem] text-[var(--color-ink)]">{t("portal")}</span>
                        <span className="text-[0.75rem] text-[var(--color-mist)]">{t("portalHint")}</span>
                      </span>
                    </PortalLink>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <Link href="/contact" className={buttonClass("primary")}>
            {t("contact")}
          </Link>
        </div>

        <button
          aria-label={open ? tCommon("close") : tCommon("menu")}
          aria-expanded={open}
          className="lg:hidden rounded-sm p-2 text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-fjord)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </Container>

      {open && (
        <div className="lg:hidden border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
          <Container className="py-6 flex flex-col gap-1">
            <div className="py-2">
              <div className="eyebrow mb-2 px-1">{t("services")}</div>
              <div className="flex flex-col gap-1">
                {SERVICES.map(({ slug, internalPath, icon: Icon }) => (
                  <Link
                    key={slug}
                    href={internalPath}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-1 py-2 text-[0.9375rem] text-[var(--color-slate)] hover:text-[var(--color-ink)]"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-card)] bg-[var(--color-paper-2)]">
                      <Icon size={16} strokeWidth={1.75} className="text-[var(--color-fjord)]" />
                    </span>
                    {tServices(`${slug}.name`)}
                  </Link>
                ))}
              </div>
            </div>

            <Link href="/work" className={mobileLinkCls} onClick={() => setOpen(false)}>
              {t("work")}
            </Link>
            <Link href="/about" className={mobileLinkCls} onClick={() => setOpen(false)}>
              {t("about")}
            </Link>
            <Link href="/careers" className={mobileLinkCls} onClick={() => setOpen(false)}>
              {t("careers")}
            </Link>

            <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-rule)] pt-5">
              <PortalLink
                path="/portal"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 text-[0.875rem] text-[var(--color-slate)] hover:text-[var(--color-ink)]"
              >
                <Building2 size={15} strokeWidth={1.5} />
                {t("clientPortal")}
              </PortalLink>
              <div className="flex items-center justify-between">
                <PortalLink
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 text-[0.875rem] text-[var(--color-slate)] hover:text-[var(--color-ink)]"
                >
                  <LogIn size={15} strokeWidth={1.5} />
                  {t("portal")}
                </PortalLink>
                <LanguageSwitcher align="right" />
              </div>
            </div>

            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className={buttonClass("primary", "mt-4 w-full")}
            >
              {t("contact")}
            </Link>
          </Container>
        </div>
      )}
    </header>
  );
}
