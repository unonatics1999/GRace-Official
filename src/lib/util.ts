import type { ZodError } from "zod";

export type ActionState = { error?: string; ok?: string } | undefined;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
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
