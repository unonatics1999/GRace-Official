"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, loginBlocked, recordLogin } from "@/lib/rate-limit";
import { createSession, destroySession } from "@/lib/session";
import { firstError, normalizeEmail, type ActionState } from "@/lib/util";

const signupSchema = z.object({
  kind: z.enum(["INDIVIDUAL", "BUSINESS"], { message: "Choose personal or business." }),
  companyName: z.string().trim().default(""),
  city: z.string().trim().min(2, "Enter your city."),
  name: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(10, "Use at least 10 characters for your password."),
  terms: z.literal("on", { message: "Agree to the Terms and Privacy Policy to continue." }),
});

export async function signup(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { kind, companyName, city, name, password } = parsed.data;
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
      company: { create: { kind, name: kind === "BUSINESS" ? companyName : name, city } },
    },
  });
  await createSession(user.id);
  redirect("/account?welcome=1");
}

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const email = normalizeEmail(parsed.data.email);
  const ip = await clientIp();
  if (await loginBlocked(email, ip)) {
    return { error: "Too many failed attempts. Wait 15 minutes and try again." };
  }

  const user = await db.user.findUnique({ where: { email } });
  // Same message either way, so the form doesn't reveal which emails have accounts.
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    await recordLogin(email, ip, false);
    return { error: "Email or password is incorrect." };
  }
  await recordLogin(email, ip, true);
  await createSession(user.id);
  redirect(user.isAdmin ? "/admin" : "/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
