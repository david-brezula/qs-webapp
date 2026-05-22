"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Menu, X, LogIn, ChevronDown } from "lucide-react";
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
  className,
  onClick,
  children,
}: {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return (
      <a href={`${appUrl}/${locale}/login`} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <Link href="/login" className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function MarketingHeader() {
  const t = useTranslations("nav");
  const tServices = useTranslations("services");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
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

        {/* Desktop nav — tablets keep the hamburger to avoid overflow. */}
        <nav className="hidden lg:flex items-center gap-9">
          <Link href="/" className={navLinkCls}>
            {t("home")}
          </Link>

          <div
            ref={servicesRef}
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              aria-expanded={servicesOpen}
              className={`${navLinkCls} inline-flex items-center gap-1`}
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
                <ul className="min-w-[16rem] rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-2 shadow-lg">
                  {SERVICES.map(({ slug, internalPath, icon: Icon }) => (
                    <li key={slug}>
                      <Link
                        href={internalPath}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[0.875rem] text-[var(--color-slate)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] transition-colors"
                      >
                        <Icon size={17} strokeWidth={1.5} className="text-[var(--color-fjord)]" />
                        {tServices(`${slug}.name`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Link href="/about" className={navLinkCls}>
            {t("about")}
          </Link>
          <Link href="/contact" className={navLinkCls}>
            {t("contact")}
          </Link>
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          <LanguageSwitcher />
          <PortalLink className="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors">
            <LogIn size={13} strokeWidth={1.5} />
            {t("portal")}
          </PortalLink>
          <Link href="/contact" className={buttonClass("primary")}>
            {t("contact")}
          </Link>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="lg:hidden p-2 text-[var(--color-ink)]"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </Container>

      {open && (
        <div className="lg:hidden border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
          <Container className="py-6 flex flex-col gap-1">
            <Link href="/" className={mobileLinkCls} onClick={() => setOpen(false)}>
              {t("home")}
            </Link>

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
                    <Icon size={17} strokeWidth={1.5} className="text-[var(--color-fjord)]" />
                    {tServices(`${slug}.name`)}
                  </Link>
                ))}
              </div>
            </div>

            <Link href="/about" className={mobileLinkCls} onClick={() => setOpen(false)}>
              {t("about")}
            </Link>
            <Link href="/contact" className={mobileLinkCls} onClick={() => setOpen(false)}>
              {t("contact")}
            </Link>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--color-rule)] pt-5">
              <PortalLink
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 text-[0.875rem] text-[var(--color-slate)] hover:text-[var(--color-ink)]"
              >
                <LogIn size={15} strokeWidth={1.5} />
                {t("portal")}
              </PortalLink>
              <LanguageSwitcher align="right" />
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
