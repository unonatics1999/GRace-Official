import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Company, User } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";

const COOKIE = "dt_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret(): Uint8Array {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export type SessionUser = User & { company: Company | null };
export type CompanyUser = User & { companyId: string; company: Company };

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return await db.user.findUnique({ where: { id: payload.sub }, include: { company: true } });
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** A member of a business. GRace admins have no company and are sent to /admin. */
export async function requireCompanyUser(): Promise<CompanyUser> {
  const user = await requireUser();
  if (!user.company) redirect("/admin");
  return user as CompanyUser;
}

/** The admin area 404s for everyone else, so it doesn't advertise that it exists. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user?.isAdmin) notFound();
  return user;
}

/** Where each kind of account lands after logging in. */
export function homeFor(user: { isAdmin: boolean; company: { accountType: string } | null }): string {
  if (user.isAdmin) return "/admin";
  return user.company?.accountType === "OWNER" ? "/dashboard" : "/bookings";
}

/** Car-owner pages (dashboard, fleet, driver). Renters are offered to become an owner instead. */
export async function requireOwner(): Promise<CompanyUser> {
  const user = await requireCompanyUser();
  if (user.company.accountType !== "OWNER") redirect("/become-owner");
  return user;
}
