import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const cs = process.env.DATABASE_URL;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: cs }) });
const users = await prisma.user.findMany({
  select: { username: true, email: true, role: true, mustChangePassword: true, createdAt: true },
  orderBy: { createdAt: 'asc' },
});
console.table(users);
await prisma.$disconnect();
