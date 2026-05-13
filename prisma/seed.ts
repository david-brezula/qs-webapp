import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { PrismaClient, Role, Locale } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@quantumsphere.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: "Quantum Sphere Admin",
      role: Role.ADMIN,
      language: Locale.EN,
    },
  });

  console.log(`Seeded admin: ${admin.email} (password: ${password})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
