"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { PHONE_HINT, normalizePhone } from "@/lib/phone";
import { overLimit } from "@/lib/memory-limit";
import { clientIp, loginBlocked, recordLogin } from "@/lib/rate-limit";
import { createSession, destroySession, homeFor, requireCompanyUser, requireUser } from "@/lib/session";
import { canManageTeam, firstError, normalizeEmail, type ActionState, formFields } from "@/lib/util";

const MIN_PASSWORD = 10;

const signupSchema = z.object({
  accountType: z.enum(["RENTER", "OWNER"], { message: "Choose whether you want to rent or list a car." }),
  kind: z.enum(["INDIVIDUAL", "BUSINESS"], { message: "Choose personal or business." }),
  companyName: z.string().trim().default(""),
  city: z.string().trim().min(2, "Enter your city."),
  phone: z.string().trim().default(""),
  name: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters for your password.`),
  terms: z.literal("on", { message: "Agree to the Terms and Privacy Policy to continue." }),
});

// Compared against when the email has no account, so a login takes as long either way and its
// timing doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function signup(_: ActionState, form: FormData): Promise<ActionState> {
  if (overLimit(`signup:${await clientIp()}`, 5, 60 * 60 * 1000)) return { error: "Too many sign-ups from this network. Try again in an hour." };
  const parsed = signupSchema.safeParse(formFields(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { accountType, kind, companyName, city, name, password } = parsed.data;
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : "";
  if (phone === null) return { error: PHONE_HINT };
  if (kind === "BUSINESS" && companyName.length < 2) return { error: "Enter your registered business name." };
  const email = normalizeEmail(parsed.data.email);

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "An account with that email already exists. Log in instead." };
  }

  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      role: "OWNER",
      company: { create: { kind, accountType, name: kind === "BUSINESS" ? companyName : name, city, phone } },
    },
  });
  await createSession(user.id);
  // Owners start by listing their car; renters go straight to the cars.
  redirect(accountType === "OWNER" ? "/fleet/new?welcome=1" : phone ? "/explore" : "/account?welcome=1");
}

const loginSchema = z.object({
  portal: z.enum(["RENTER", "OWNER", "ADMIN"]).default("RENTER"),
  email: z.string().trim().min(1, "Enter your email."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formFields(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const email = normalizeEmail(parsed.data.email);
  const ip = await clientIp();
  if (await loginBlocked(email, ip)) {
    return { error: "Too many failed attempts. Wait 15 minutes and try again." };
  }

  const user = await db.user.findUnique({ where: { email }, include: { company: true } });
  // Same message either way, so the form doesn't reveal which emails have accounts.
  const passwordOk = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    await recordLogin(email, ip, false);
    return { error: "Email or password is incorrect." };
  }
  // Admins sign in only on the staff page, and only admins can use it. Same message as a wrong
  // password, so neither page reveals which emails are admin accounts.
  if ((parsed.data.portal === "ADMIN") !== user.isAdmin) {
    await recordLogin(email, ip, false);
    return { error: "Email or password is incorrect." };
  }

  await recordLogin(email, ip, true);
  await createSession(user.id);
  redirect(homeFor(user));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

/** A renter starts listing cars. One account can do both. */
export async function becomeOwner(): Promise<void> {
  const me = await requireCompanyUser();
  if (!canManageTeam(me.role)) redirect("/account");
  await db.company.update({ where: { id: me.companyId }, data: { accountType: "OWNER" } });
  redirect("/fleet/new?welcome=1");
}

const credentialsSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  email: z.string().trim().email("Enter a valid email."),
  newPassword: z.string().default(""),
  confirmPassword: z.string().default(""),
});

/** Change the sign-in email and/or password. Works for every account, including admins. */
export async function updateCredentials(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireUser();
  const parsed = credentialsSchema.safeParse(formFields(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { currentPassword, newPassword, confirmPassword } = parsed.data;
  const email = normalizeEmail(parsed.data.email);

  if (!(await bcrypt.compare(currentPassword, me.passwordHash))) return { error: "Your current password is incorrect." };
  if (newPassword && newPassword.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters for the new password.` };
  if (newPassword !== confirmPassword) return { error: "The new passwords don't match." };
  if (email !== me.email && (await db.user.findUnique({ where: { email } }))) return { error: "That email is already used by another account." };
  if (email === me.email && !newPassword) return { error: "Nothing to change." };

  await db.user.update({
    where: { id: me.id },
    data: {
      email,
      ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 10), sessionsValidAfter: new Date() } : {}),
    },
  });
  // A new password signs out other devices; keep this one signed in.
  if (newPassword) await createSession(me.id);
  if (me.isAdmin) {
    const changed = [email !== me.email && "email", newPassword && "password"].filter(Boolean).join(" and ");
    await audit(me.id, "admin.credentials_changed", "User", me.id, changed);
  }
  revalidatePath("/settings");
  revalidatePath("/admin/settings");
  return { ok: "Saved. Use the new details next time you log in." };
}
