import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware navigation helpers. Use these inside `[locale]` routes instead
// of `next/link` / `next/navigation` so localized slugs are applied per locale.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
