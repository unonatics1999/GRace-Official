import { PrismaClient } from "@prisma/client";

// One client per process; Next's dev server reloads modules, so keep it on globalThis.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// SQLite (local development): write-ahead logging lets pages read while a booking is being
// written. The setting is stored in the database file, so running it once per process is plenty.
if (process.env.DATABASE_URL?.startsWith("file:")) {
  db.$queryRawUnsafe("PRAGMA journal_mode = WAL;").catch(() => {});
}
