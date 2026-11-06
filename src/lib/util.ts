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

/** No legitimate text field is longer than this; the longest real one (an admin message) is 2,000. */
export const MAX_FIELD_CHARS = 5000;

/**
 * Form fields as a plain object, for zod. Oversized text is cut down before validation, so a giant
 * payload never reaches a schema, the database or a log. File fields are dropped (uploads read them
 * with form.get/getAll).
 */
export function formFields(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string" && key.length <= 100) out[key] = value.slice(0, MAX_FIELD_CHARS);
  }
  return out;
}
