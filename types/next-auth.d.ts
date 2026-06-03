import type { DefaultSession } from "next-auth";

type PortalRole = "ADMIN" | "WORKER" | "CLIENT";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: PortalRole;
      language: "EN" | "SK";
      clientId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    username?: string;
    role: PortalRole;
    language: "EN" | "SK";
    clientId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: PortalRole;
    language: "EN" | "SK";
    clientId: string | null;
  }
}
