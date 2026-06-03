import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { requireClient } from "@/lib/portal/session";
import { prisma } from "@/lib/prisma";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { LangSync } from "@/components/portal/LangSync";
import { signOut } from "@/auth";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();

  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mustChangePassword: true, name: true },
  });
  if (!fresh) redirect("/login");
  if (fresh.mustChangePassword) redirect("/change-password");

  const messages = await getMessages();
  const locale = await getLocale();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <LangSync locale={locale} />
      <div className="min-h-screen bg-bg">
        <ClientTopBar name={fresh.name} signOutAction={doSignOut} />
        <main className="mx-auto max-w-5xl p-6 md:p-10">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
