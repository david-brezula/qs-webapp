import Link from "next/link";
import { NAV_LINKS, FOOTER } from "@/lib/content";
import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="border-t border-border-soft bg-bg">
      <Container className="py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <span
              aria-hidden
              className="inline-block h-6 w-6 rounded-sm"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-navy) 0 50%, var(--color-accent) 50% 100%)",
              }}
            />
            <span className="font-semibold tracking-[0.2em] text-navy text-sm">
              QUANTUM SPHERE
            </span>
          </div>
          <p className="text-sm text-slate-ink max-w-sm leading-relaxed">
            {FOOTER.tagline}
          </p>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/60 mb-3">
            Site
          </div>
          <ul className="space-y-2 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-slate-ink hover:text-navy">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/contact" className="text-slate-ink hover:text-navy">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/60 mb-3">
            Contact
          </div>
          <ul className="space-y-2 text-sm text-slate-ink">
            <li>{FOOTER.address}</li>
            <li>{FOOTER.phone}</li>
            <li>
              <a
                href={`mailto:${FOOTER.email}`}
                className="hover:text-navy"
              >
                {FOOTER.email}
              </a>
            </li>
          </ul>
        </div>
      </Container>

      <Container className="py-6 border-t border-border-soft flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-muted">
        <div>© {new Date().getFullYear()} Quantum Sphere. All rights reserved.</div>
        <div>Solar construction subcontractor · CO general office</div>
      </Container>
    </footer>
  );
}
