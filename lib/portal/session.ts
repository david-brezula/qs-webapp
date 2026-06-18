import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Dedupe the session lookup within a single request: the portal layout and the
// page it renders both call requireUser(), and requireAdmin/requireClient call
// it again. React cache() collapses those to one auth() decode per render pass.
// Request-scoped only — no cross-request leakage. redirect() stays outside the
// cached function (it throws, which must not be memoised).
const getSession = cache(async () => auth());

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function requireClient() {
  const user = await requireUser();
  if (user.role !== "CLIENT" || !user.clientId) redirect("/login");
  return { ...user, clientId: user.clientId };
}
