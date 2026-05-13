"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { NAV_LINKS } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

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
      className={`sticky top-0 z-40 transition-colors duration-200 ${
        scrolled
          ? "bg-bg/85 backdrop-blur border-b border-border-soft"
          : "bg-transparent"
      }`}
    >
      <Container className="flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-sm bg-navy"
            style={{
              background:
                "linear-gradient(135deg, var(--color-navy) 0 50%, var(--color-accent) 50% 100%)",
            }}
          />
          <span className="font-semibold tracking-[0.2em] text-navy text-sm">
            QUANTUM SPHERE
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-slate-ink hover:text-navy transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-ink hover:text-navy transition-colors"
          >
            <LogIn size={14} strokeWidth={1.75} />
            Worker login
          </Link>
          <Button href="/contact" variant="primary">
            Request capacity
          </Button>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="md:hidden p-2 text-navy"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </Container>

      {open && (
        <div className="md:hidden border-t border-border-soft bg-bg">
          <Container className="py-4 flex flex-col gap-4">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-base text-slate-ink hover:text-navy"
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
              className="inline-flex items-center justify-center gap-1.5 text-sm text-slate-ink hover:text-navy py-2"
            >
              <LogIn size={14} strokeWidth={1.75} />
              Worker login
            </Link>
          </Container>
        </div>
      )}
    </header>
  );
}
