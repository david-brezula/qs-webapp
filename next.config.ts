import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    // Rewrite framer-motion barrel imports to direct module paths so only the
    // animation primitives actually used ship to the client. lucide-react is
    // optimised automatically by Next.js, so it needs no entry here.
    optimizePackageImports: ["framer-motion"],
  },
};

export default withNextIntl(nextConfig);
