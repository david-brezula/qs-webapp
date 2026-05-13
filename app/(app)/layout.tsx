import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/portal/session";
import { Sidebar } from "@/components/portal/Sidebar";
import { TopBar } from "@/components/portal/TopBar";
import { signOut } from "@/auth";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const messages = await getMessages();
  const locale = await getLocale();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div className="min-h-screen flex bg-bg">
        <Sidebar role={user.role} />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar
            name={user.name ?? user.email ?? ""}
            email={user.email ?? ""}
            language={(user.language?.toLowerCase() ?? "en") as "en" | "sk"}
            signOutAction={doSignOut}
          />
          <main className="flex-1 p-6 md:p-10">{children}</main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
