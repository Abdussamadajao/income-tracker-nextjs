import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Decimal } from "@/generated/prisma/internal/prismaNamespaceBrowser";

// Next.js dev mode hot-reloads modules on every request, which would
// otherwise spin up a fresh PrismaClient (and a fresh connection pool)
// each time. Caching the instance on `globalThis` in development avoids
// exhausting Postgres connections. Production always gets a single fresh
// instance per server process.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { Decimal };
