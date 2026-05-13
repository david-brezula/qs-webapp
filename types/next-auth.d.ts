import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "ADMIN" | "WORKER";
      language: "EN" | "SK";
    } & DefaultSession["user"];
  }

  interface User {
    username?: string;
    role: "ADMIN" | "WORKER";
    language: "EN" | "SK";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "ADMIN" | "WORKER";
    language: "EN" | "SK";
  }
}
