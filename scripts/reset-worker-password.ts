import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = "worker";
  const password = "worker";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { username },
    data: { passwordHash, mustChangePassword: true, active: true },
  });

  console.log(`Reset credentials: ${user.username} / ${password} (role: ${user.role}, mustChangePassword: ${user.mustChangePassword})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
