import Link from "next/link";
import { NAV_LINKS, FOOTER } from "@/lib/content";
import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
      <Container className="pt-20 pb-14">
        <div className="grid gap-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <svg
                viewBox="0 0 32 32"
                width="26"
                height="26"
                className="text-[var(--color-ink)]"
                aria-hidden
              >
                <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.25" />
                <circle cx="16" cy="16" r="5" fill="currentColor" />
                <line x1="16" y1="2" x2="16" y2="30" stroke="currentColor" strokeWidth="0.6" />
                <line x1="2" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="0.6" />
              </svg>
              <span
                className="font-display text-[1.05rem] tracking-[-0.01em] text-[var(--color-ink)]"
                style={{ fontWeight: 600 }}
              >
                Quantum Sphere
              </span>
            </div>
            <p className="text-[0.9375rem] text-[var(--color-slate)] max-w-sm leading-[1.6]">
              {FOOTER.tagline}
            </p>
          </div>

          <FooterCol title="Site">
            <ul className="space-y-2.5 text-[0.875rem]">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/contact" className="text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors">
                  Worker login
                </Link>
              </li>
            </ul>
          </FooterCol>

          <FooterCol title="Office">
            <ul className="space-y-2.5 text-[0.875rem] text-[var(--color-slate)] leading-[1.5]">
              {FOOTER.address.split(" · ").map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </FooterCol>

          <FooterCol title="Contact">
            <ul className="space-y-2.5 text-[0.875rem] text-[var(--color-slate)]">
              <li>
                <a href={`tel:${FOOTER.phone.replace(/\s/g, "")}`} className="hover:text-[var(--color-ink)] transition-colors">
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

      <Container className="py-6 border-t border-[var(--color-rule)] flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--color-mist)] font-mono">
        <div>© {new Date().getFullYear()} Quantum Sphere s.r.o.</div>
        <div className="text-center md:text-right">{FOOTER.vat}</div>
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
