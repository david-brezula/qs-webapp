"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { NAV_LINKS } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

function Logo() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-3"
      aria-label="Quantum Sphere — home"
    >
      <svg
        viewBox="0 0 32 32"
        width="28"
        height="28"
        className="text-[var(--color-ink)]"
        aria-hidden
      >
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="16" cy="16" r="5" fill="currentColor" />
        <line x1="16" y1="2" x2="16" y2="30" stroke="currentColor" strokeWidth="0.6" />
        <line x1="2" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="0.6" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1rem] tracking-[-0.01em] text-[var(--color-ink)]" style={{ fontWeight: 450 }}>
          Quantum Sphere
        </span>
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-[var(--color-mist)] mt-0.5">
          Solar EPC · since 2017
        </span>
      </span>
    </Link>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--color-paper)]/80 backdrop-blur-md border-b border-[var(--color-rule)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <Container className="flex items-center justify-between py-5">
        <Logo />

        {/* lg (not md): the full desktop bar overflows at ~768px, so tablets keep the hamburger. */}
        <nav className="hidden lg:flex items-center gap-9">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative text-[0.8125rem] text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-[var(--color-ink)] after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-300"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors"
          >
            <LogIn size={13} strokeWidth={1.5} />
            Worker login
          </Link>
          <Button href="/contact" variant="primary">
            Request capacity
          </Button>
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
          <Container className="py-6 flex flex-col gap-5">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-base text-[var(--color-slate)] hover:text-[var(--color-ink)]"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <Button href="/contact" variant="primary" className="w-full">
              Request capacity
            </Button>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 text-sm text-[var(--color-slate)] hover:text-[var(--color-ink)] py-2"
            >
              <LogIn size={14} strokeWidth={1.5} />
              Worker login
            </Link>
          </Container>
        </div>
      )}
    </header>
  );
}
