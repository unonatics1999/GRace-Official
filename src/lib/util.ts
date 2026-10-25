import type { ZodError } from "zod";
import { CURRENCY, LOCALE } from "./constants";

export type ActionState = { error?: string; ok?: string } | undefined;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Pesos from centavos: "₱3,500" for whole amounts, "₱3,412.50" otherwise. */
export function formatCents(cents: number): string {
  const digits = cents % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cents / 100);
}

export function firstError(error: ZodError): string {
  return error.issues[0]?.message ?? "Please check the form.";
}

export function canManageFleet(role: string): boolean {
  return role === "OWNER" || role === "FLEET_MANAGER";
}

export function canManageTeam(role: string): boolean {
  return role === "OWNER";
}
