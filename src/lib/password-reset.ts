import { createHash, randomBytes } from "node:crypto";

export const RESET_TTL_MS = 30 * 60 * 1000;

/** A random, URL-safe token. Only its hash is stored, so a database leak can't be used to reset passwords. */
export function newResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A reset link works once, within its time window. */
export function resetUsable(reset: { expiresAt: Date; usedAt: Date | null } | null, now = new Date()): boolean {
  return reset !== null && reset.usedAt === null && reset.expiresAt > now;
}
