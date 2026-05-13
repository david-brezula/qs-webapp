import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quantum Sphere — Solar subcontracting at utility scale",
  description:
    "Quantum Sphere is a solar construction subcontractor for general contractors and EPCs. Rooftop, ground-mount, racking, BOS, commissioning, and O&M.",
  openGraph: {
    title: "Quantum Sphere",
    description: "Solar subcontracting at utility scale.",
    type: "website",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
