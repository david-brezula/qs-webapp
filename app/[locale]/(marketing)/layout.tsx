import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quantum Sphere — Solar EPC subcontracting across Europe",
  description:
    "Slovak solar construction subcontractor for European EPCs and GCs. Rooftop, ground‑mount, racking, BOS, commissioning and service — across DACH and Scandinavia.",
  openGraph: {
    title: "Quantum Sphere",
    description: "Solar EPC subcontracting across DACH and the Nordics.",
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
