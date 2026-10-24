import { PrismaClient } from "@prisma/client";

// One client per process; Next's dev server reloads modules, so keep it on globalThis.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
