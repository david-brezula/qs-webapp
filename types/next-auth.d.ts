import type { DefaultSession } from "next-auth";
import type { PortalRole } from "@/lib/portal/roles";

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
