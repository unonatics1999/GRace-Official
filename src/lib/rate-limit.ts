import { headers } from "next/headers";
import { ipFromHeaders } from "./client-ip";
import { db } from "./db";

const WINDOW_MS = 15 * 60 * 1000;
// Wrong passwords for one email from one address: stops guessing without letting a stranger lock
// the real owner out from their own device.
const MAX_FAILURES_PER_EMAIL_AND_IP = 5;
// Wrong passwords from one address across all emails: stops password spraying.
const MAX_FAILURES_PER_IP = 20;
// Wrong passwords for one email from everywhere: stops a distributed attack on one account.
const MAX_FAILURES_PER_EMAIL = 50;

export async function clientIp(): Promise<string> {
  return ipFromHeaders(await headers());
}

/** Stored in the database so the limit holds across server instances and restarts. */
export async function loginBlocked(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const failed = { success: false, createdAt: { gte: since } };
  const [byEmailAndIp, byIp, byEmail] = await Promise.all([
    db.loginAttempt.count({ where: { email, ip, ...failed } }),
    db.loginAttempt.count({ where: { ip, ...failed } }),
    db.loginAttempt.count({ where: { email, ...failed } }),
  ]);
  return byEmailAndIp >= MAX_FAILURES_PER_EMAIL_AND_IP || byIp >= MAX_FAILURES_PER_IP || byEmail >= MAX_FAILURES_PER_EMAIL;
}

export async function recordLogin(email: string, ip: string, success: boolean): Promise<void> {
  await db.loginAttempt.create({ data: { email, ip, success } });
}
