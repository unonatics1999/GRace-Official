"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { env, isLocalDevelopment } from "@/lib/env";
import { overLimit } from "@/lib/memory-limit";
import { isMobile, sendMessage } from "@/lib/notify";
import { RESET_TTL_MS, hashResetToken, newResetToken, resetUsable } from "@/lib/password-reset";
import { clientIp } from "@/lib/rate-limit";
import { createSession, homeFor } from "@/lib/session";
import { firstError, normalizeEmail, type ActionState } from "@/lib/util";

const MIN_PASSWORD = 10;
const MAX_REQUESTS_PER_HOUR = 3;

const requestSchema = z.object({
  email: z.string().trim().email("Enter the email you signed up with."),
  channel: z.enum(["EMAIL", "SMS"]).default("EMAIL"),
});

// The same reply in every case (no account, no mobile number, too many requests, sent), so the
// form can't be used to find out which emails have accounts.
const SENT = "If that account exists, we've sent a reset link. It works once and expires in 30 minutes.";

export type ResetRequestState = (NonNullable<ActionState> & { devLink?: string }) | undefined;

export async function requestPasswordReset(_: ResetRequestState, form: FormData): Promise<ResetRequestState> {
  const parsed = requestSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const email = normalizeEmail(parsed.data.email);
  // Separate from the login limiter, so failed logins can't block someone from resetting.
  if (overLimit(`reset:${await clientIp()}`, 10, 15 * 60 * 1000)) return { error: "Too many requests. Wait 15 minutes and try again." };

  const user = await db.user.findUnique({ where: { email }, include: { company: true } });
  if (!user) return { ok: SENT };

  const recent = await db.passwordReset.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (recent >= MAX_REQUESTS_PER_HOUR) return { ok: SENT };

  const phone = user.company?.phone ?? "";
  if (parsed.data.channel === "SMS" && !isMobile(phone)) return { ok: SENT };

  // A new link replaces any earlier one.
  await db.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
  const { token, tokenHash } = newResetToken();
  await db.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TTL_MS) } });

  const link = `${env().APP_URL}/reset-password?token=${token}`;
  // The link is a live credential: it's sent, but never stored in the message log.
  const storedBody = "Password reset link (not stored)";
  const result =
    parsed.data.channel === "SMS"
      ? await sendMessage({ toUserId: user.id, channel: "SMS", address: phone, kind: "PASSWORD_RESET", storedBody, body: `GRace: reset your password here (valid 30 min): ${link}` })
      : await sendMessage({
          toUserId: user.id,
          channel: "EMAIL",
          address: user.email,
          kind: "PASSWORD_RESET",
          storedBody,
          subject: "Reset your GRace password",
          body: `Hi ${user.name},\n\nWe received a request to reset your GRace password. Open this link within 30 minutes to choose a new one:\n\n${link}\n\nIf you didn't ask for this, you can ignore this message; your password stays the same.\n\nGRace Car Rental`,
        });

  if (result.status === "FAILED") return { error: "We couldn't send the link right now. Please try again in a few minutes." };
  // Local development without an email/SMS provider: show the link so the flow can be tested.
  return result.status === "SIMULATED" && isLocalDevelopment() ? { ok: SENT, devLink: link } : { ok: SENT };
}

const resetSchema = z.object({
  token: z.string().min(20, "This reset link is invalid."),
  password: z.string().min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters for your password.`),
  confirm: z.string(),
});

export async function resetPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (parsed.data.password !== parsed.data.confirm) return { error: "The passwords don't match." };

  const reset = await db.passwordReset.findUnique({ where: { tokenHash: hashResetToken(parsed.data.token) } });
  if (!resetUsable(reset)) return { error: "This reset link has expired or was already used. Request a new one." };

  const now = new Date();
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await db.$transaction(async (tx) => {
    // Claim the link atomically, so two simultaneous submissions can't both use it.
    const claimed = await tx.passwordReset.updateMany({ where: { id: reset!.id, usedAt: null }, data: { usedAt: now } });
    if (claimed.count === 0) return null;
    return tx.user.update({ where: { id: reset!.userId }, data: { passwordHash, sessionsValidAfter: now }, include: { company: true } });
  });
  if (!user) return { error: "This reset link has expired or was already used. Request a new one." };
  if (user.isAdmin) await audit(user.id, "admin.password_reset", "User", user.id, "via reset link");
  await createSession(user.id);
  redirect(homeFor(user));
}
