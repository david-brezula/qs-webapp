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
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent mb-6">
            <CheckCircle2 size={28} strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-navy">
            Got it — thanks.
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-ink leading-relaxed">
            Your project hit our queue. Someone from the Quantum Sphere team
            will reply within one business day with crew availability and a
            working estimate.
          </p>
          <div className="mt-10">
            <Button href="/" variant="secondary">
              Back to home
            </Button>
          </div>
          <p className="mt-8 text-xs text-muted">
            If your timeline is urgent, call{" "}
            <Link href="tel:+13035550188" className="underline hover:text-navy">
              (303) 555-0188
            </Link>
            .
          </p>
        </Container>
      </main>
      <Footer />
    </>
  );
}
