import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function ThanksPage() {
  return (
    <>
      <Nav />
      <main className="py-24 md:py-32">
        <Container className="max-w-2xl text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-ember)] text-[var(--color-ember)] mb-7">
            <CheckCircle2 size={28} strokeWidth={1.5} />
          </div>
          <h1
            className="font-display text-[2.5rem] md:text-[4rem] tracking-[-0.03em] text-[var(--color-ink)] leading-[1.02]"
            style={{ fontWeight: 350 }}
          >
            Got it — thanks.
          </h1>
          <p className="mt-5 text-base md:text-[1.0625rem] text-[var(--color-slate)] leading-[1.65]">
            Your project hit our queue. Someone from the Quantum Sphere team
            will reply within one business day with crew availability and an
            indicative estimate.
          </p>
          <div className="mt-10">
            <Button href="/" variant="secondary">
              Back to home
            </Button>
          </div>
          <p className="mt-8 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-mist)]">
            If your timeline is urgent, call{" "}
            <Link
              href="tel:+421255560188"
              className="text-[var(--color-ink)] hover:text-[var(--color-fjord)]"
            >
              +421 2 5556 0188
            </Link>
          </p>
        </Container>
      </main>
      <Footer />
    </>
  );
}
