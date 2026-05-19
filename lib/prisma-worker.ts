import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrismaWorker = globalThis as unknown as {
  prismaWorker: PrismaClient | undefined;
};

function createWorkerClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL_WORKER;
  if (!connectionString) {
    throw new Error("DATABASE_URL_WORKER environment variable is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Prisma client connecting as the restricted `qs_worker` role. Every query it
 * issues is subject to the worker wage RLS policies. Use only through
 * `withWorkerScope`.
 *
 * If queries are issued without a surrounding `withWorkerScope` call (i.e.
 * `app.user_id` is not set), all RLS policies evaluate to false and every
 * table returns zero rows — the connection fails closed, not open.
 */
export const prismaWorker =
  globalForPrismaWorker.prismaWorker ?? createWorkerClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrismaWorker.prismaWorker = prismaWorker;
}

/**
 * Runs `fn` against the RLS-enforced worker connection inside a transaction
 * whose `app.user_id` setting is `userId`. The setting is transaction-local
 * (third arg of `set_config` is `true`), so it is safe under connection
 * pooling -- it never leaks to another request's transaction.
 */
export async function withWorkerScope<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prismaWorker.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
