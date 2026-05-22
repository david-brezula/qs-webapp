"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/lib/i18n/routing";

// Persists the signed-in user's preferred locale. Best-effort: the URL/cookie
// locale always applies; this only adds cross-session/device persistence. The
// `User.locale` column may not be migrated yet (see DEPLOYMENT.md) — a failure
// here must never break navigation, so it is swallowed.
export async function updateUserLocale(locale: string): Promise<void> {
  if (!(routing.locales as readonly string[]).includes(locale)) return;
  const session = await auth();
  if (!session?.user?.id) return;
  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { locale },
    });
  } catch (err) {
    console.error("updateUserLocale failed (is the locale column migrated?):", err);
  }
}
