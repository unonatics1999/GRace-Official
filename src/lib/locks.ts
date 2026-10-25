import type { Prisma } from "@prisma/client";

/**
 * Serialises work on one vehicle's calendar for the rest of the transaction, so two approvals
 * or payments for overlapping dates can't both pass their availability check.
 * PostgreSQL: a transaction-scoped advisory lock. SQLite (local development) already allows only
 * one writer at a time, so there is nothing to do.
 */
export async function lockVehicle(tx: Prisma.TransactionClient, vehicleId: string): Promise<void> {
  if (process.env.DATABASE_URL?.startsWith("file:")) return;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${vehicleId}))`;
}
