import { headers } from "next/headers";
import { db } from "./db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** Stored in the database so the limit holds across server instances and restarts. */
export async function loginBlocked(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    db.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } }),
    db.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } }),
  ]);
  return byEmail >= MAX_FAILURES_PER_EMAIL || byIp >= MAX_FAILURES_PER_IP;
}

export async function recordLogin(email: string, ip: string, success: boolean): Promise<void> {
  await db.loginAttempt.create({ data: { email, ip, success } });
}
