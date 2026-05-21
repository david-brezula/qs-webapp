import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations, getLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { LocaleToggle } from "@/components/portal/LocaleToggle";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, name: true, mustChangePassword: true, language: true },
  });
  if (!user) redirect("/login");

  const t = await getTranslations("changePassword");
  const tCommon = await getTranslations("common");
  const locale = (await getLocale()) as "en" | "sk";

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Container className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--color-navy) 0 50%, var(--color-accent) 50% 100%)",
            }}
          />
          <span className="font-semibold tracking-[0.2em] text-navy text-sm">
            QUANTUM SPHERE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <LocaleToggle current={locale} />
          <form action={doSignOut}>
            <button className="text-sm text-slate-ink hover:text-navy" type="submit">
              {tCommon("cancel")}
            </button>
          </form>
        </div>
      </Container>

      <main className="flex-1 grid place-items-center px-6">
        <div className="w-full max-w-sm bg-surface border border-border-soft rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-navy mb-2">{t("title")}</h1>
          <p className="text-sm text-muted mb-1">{user.name}</p>
          <p className="text-xs text-muted mb-6 font-mono">{user.username}</p>
          {user.mustChangePassword && (
            <p className="text-sm text-accent font-semibold mb-6">{t("forced")}</p>
          )}
          <ChangePasswordForm forced={user.mustChangePassword} />
        </div>
      </main>
    </div>
  );
}
