import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "WORKER";
      language: "EN" | "SK";
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "WORKER";
    language: "EN" | "SK";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "WORKER";
    language: "EN" | "SK";
  }
}
