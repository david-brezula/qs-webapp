import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Quantum Sphere — Solar subcontracting at utility scale",
  description:
    "Quantum Sphere is a solar construction subcontractor for general contractors and EPCs. Rooftop, ground-mount, racking, BOS, commissioning, and O&M.",
  metadataBase: new URL("https://quantumsphere.example"),
  openGraph: {
    title: "Quantum Sphere",
    description: "Solar subcontracting at utility scale.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
