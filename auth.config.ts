import type { NextAuthConfig } from "next-auth";
import type { PortalRole } from "@/lib/portal/roles";

/**
 * Edge-safe subset of the Auth.js config. Used by middleware/proxy where the
 * Node runtime is not available. The full config in auth.ts merges this with
 * a Credentials provider whose `authorize` callback uses bcrypt + Prisma.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [], // overridden in auth.ts
  callbacks: {
    authorized: ({ auth }) => Boolean(auth?.user),
    jwt: ({ token, user, trigger, session }) => {
      if (user) {
        token.id = (user as { id: string }).id;
        token.username = (user as { username?: string }).username ?? "";
        token.role = (user as { role: PortalRole }).role;
        token.language = (user as { language: "EN" | "SK" }).language;
        token.clientId = (user as { clientId?: string | null }).clientId ?? null;
      }
      if (trigger === "update" && session?.language) {
        token.language = session.language;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as PortalRole;
        session.user.language = token.language as "EN" | "SK";
        session.user.clientId = (token.clientId as string | null) ?? null;
      }
      return session;
    },
  },
};
