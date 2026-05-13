import type { NextAuthConfig } from "next-auth";

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
        token.role = (user as { role: "ADMIN" | "WORKER" }).role;
        token.language = (user as { language: "EN" | "SK" }).language;
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
        session.user.role = token.role as "ADMIN" | "WORKER";
        session.user.language = token.language as "EN" | "SK";
      }
      return session;
    },
  },
};
