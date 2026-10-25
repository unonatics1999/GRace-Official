import { Prisma } from "@prisma/client";

// Transactions that touch a vehicle's calendar can collide under load: on PostgreSQL a write
// conflict (P2034), on SQLite a lock wait that times out. Both are safe to retry from the start.

const RETRYABLE = new Set(["P2034", "P1008", "P2024"]);

function isRetryable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE.has(error.code) || /timed? ?out|database is locked|busy/i.test(error.message);
  }
  return false;
}

export async function withTxRetry<T>(run: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= attempts || !isRetryable(error)) throw error;
      // Jittered backoff so retries don't collide again.
      await new Promise((r) => setTimeout(r, 50 * attempt + Math.random() * 100));
    }
  }
}
