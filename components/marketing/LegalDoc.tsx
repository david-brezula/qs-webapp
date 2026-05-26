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
