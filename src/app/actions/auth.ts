"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { firstError, normalizeEmail, type ActionState } from "@/lib/util";

const signupSchema = z.object({
  companyName: z.string().trim().min(2, "Enter your company name."),
  city: z.string().trim().min(2, "Enter the city your fleet is based in."),
  name: z.string().trim().min(2, "Enter your name."),
  email: z.string().trim().email("Enter a valid work email."),
  password: z.string().min(8, "Use at least 8 characters for your password."),
});

export async function signup(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { companyName, city, name, password } = parsed.data;
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
      company: { create: { name: companyName, city } },
    },
  });
  await createSession(user.id);
  redirect("/dashboard");
}

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const user = await db.user.findUnique({ where: { email: normalizeEmail(parsed.data.email) } });
  // Same message either way, so the form doesn't reveal which emails have accounts.
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }
  await createSession(user.id);
  redirect(user.isAdmin ? "/admin" : "/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
