import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  datasource: {
    // DIRECT_URL = the non-pooled Supabase connection (port 5432).
    // Required for migrations; Prisma 7 does not support pgbouncer for DDL.
    // DATABASE_URL (pooler, port 6543) is used at runtime via lib/prisma.ts.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
