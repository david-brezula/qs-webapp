import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Quantum Sphere — Solar EPC subcontracting across Europe",
  description:
    "Solar construction subcontractor based in Slovakia. Crews for utility, commercial and rooftop installations across DACH and Scandinavia.",
  metadataBase: new URL("https://quantumsphere.eu"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
