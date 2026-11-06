"use server";

// Admin create / edit / delete for accounts, users and vehicles. Every change is audit-logged.
// Records that money or bookings depend on are never hard-deleted: the delete is refused with a
// reason, and suspending (accounts) or hiding (vehicles) is the way to take them out of use.

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { parseDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { invalidateListings } from "@/lib/listing-cache";
import { normalizePhone, PHONE_HINT } from "@/lib/phone";
import { requireAdmin } from "@/lib/session";
import { firstError, normalizeEmail, type ActionState } from "@/lib/util";
import { vehicleData } from "@/lib/vehicle-input";

const refresh = () => {
  invalidateListings();
  revalidatePath("/admin", "layout");
};
const MIN_PASSWORD = 10;

// ── Accounts ──────────────────────────────────────────────────────────────

const accountSchema = z.object({
  name: z.string().trim().min(2, "Enter the account name."),
  kind: z.enum(["INDIVIDUAL", "BUSINESS"]),
  accountType: z.enum(["RENTER", "OWNER"]),
  status: z.enum(["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]),
  city: z.string().trim().min(2, "Enter the city."),
  phone: z.string().trim().default(""),
  address: z.string().trim().max(300).default(""),
  registrationNo: z.string().trim().max(40).default(""),
  tin: z.string().trim().max(30).default(""),
  govIdType: z.string().trim().max(40).default(""),
  govIdNumber: z.string().trim().max(40).default(""),
  licenceNo: z.string().trim().toUpperCase().max(20).default(""),
  licenceExpiry: z.string().default(""),
  payoutDetails: z.string().trim().max(300).default(""),
});

function accountData(form: FormData) {
  const parsed = accountSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) } as const;
  const { licenceExpiry, phone, ...rest } = parsed.data;
  const normalized = phone ? normalizePhone(phone) : "";
  if (normalized === null) return { error: PHONE_HINT } as const;
  if (licenceExpiry && !parseDay(licenceExpiry)) return { error: "Enter a valid licence expiry date." } as const;
  return { data: { ...rest, phone: normalized, licenceExpiry: licenceExpiry ? parseDay(licenceExpiry) : null } } as const;
}

export async function adminCreateAccount(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const account = accountData(form);
  if ("error" in account) return { error: account.error };
  const ownerName = String(form.get("ownerName") ?? "").trim();
  const ownerEmail = normalizeEmail(String(form.get("ownerEmail") ?? ""));
  const password = String(form.get("ownerPassword") ?? "");
  if (ownerName.length < 2) return { error: "Enter the owner's name." };
  if (!z.string().email().safeParse(ownerEmail).success) return { error: "Enter the owner's email." };
  if (password.length < MIN_PASSWORD) return { error: `The temporary password needs ${MIN_PASSWORD}+ characters.` };
  if (await db.user.findUnique({ where: { email: ownerEmail } })) return { error: "That email already has an account." };

  const company = await db.company.create({
    data: {
      ...account.data,
      users: { create: { name: ownerName, email: ownerEmail, role: "OWNER", passwordHash: await bcrypt.hash(password, 10) } },
    },
  });
  await audit(admin.id, "account.created", "Company", company.id, company.name);
  refresh();
  redirect(`/admin/companies/${company.id}?created=1`);
}

export async function adminUpdateAccount(companyId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const account = accountData(form);
  if ("error" in account) return { error: account.error };
  await db.company.update({ where: { id: companyId }, data: account.data });
  await audit(admin.id, "account.updated", "Company", companyId, `status ${account.data.status}, type ${account.data.accountType}`);
  refresh();
  return { ok: "Account saved." };
}

export async function adminDeleteAccount(companyId: string): Promise<void> {
  const admin = await requireAdmin();
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: { _count: { select: { bookings: true, payouts: true } }, vehicles: { include: { _count: { select: { bookings: true } } } } },
  });
  if (!company) redirect("/admin/companies");
  const hasHistory = company._count.bookings > 0 || company._count.payouts > 0 || company.vehicles.some((v) => v._count.bookings > 0);
  if (hasHistory) redirect(`/admin/companies/${companyId}?error=history`);

  const users = await db.user.findMany({ where: { companyId }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  if (await db.auditLog.count({ where: { actorId: { in: userIds } } })) redirect(`/admin/companies/${companyId}?error=history`);

  await db.$transaction([
    // Vehicles cascade to their photos, documents and availability windows.
    db.vehicle.deleteMany({ where: { companyId } }),
    db.driver.deleteMany({ where: { userId: { in: userIds } } }),
    db.document.deleteMany({ where: { companyId } }),
    db.user.deleteMany({ where: { companyId } }),
    db.company.delete({ where: { id: companyId } }),
  ]);
  await audit(admin.id, "account.deleted", "Company", companyId, company.name);
  refresh();
  redirect("/admin/companies?deleted=1");
}

// ── Users ─────────────────────────────────────────────────────────────────

const userSchema = z.object({
  name: z.string().trim().min(2, "Enter the name."),
  email: z.string().trim().email("Enter a valid email."),
  role: z.enum(["OWNER", "FLEET_MANAGER", "DRIVER"]).default("OWNER"),
  companyId: z.string().default(""),
  isAdmin: z.preprocess((v) => v === "on", z.boolean()),
  password: z.string().default(""),
});

export async function adminCreateUser(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = userSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { name, role, companyId, isAdmin, password } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  if (password.length < MIN_PASSWORD) return { error: `The temporary password needs ${MIN_PASSWORD}+ characters.` };
  if (!isAdmin && !companyId) return { error: "Pick the account this user belongs to, or make them an admin." };
  if (await db.user.findUnique({ where: { email } })) return { error: "That email already has an account." };

  const user = await db.user.create({
    data: {
      name,
      email,
      role,
      isAdmin,
      companyId: isAdmin ? null : companyId,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  await audit(admin.id, isAdmin ? "admin.created" : "user.created", "User", user.id, email);
  refresh();
  redirect(`/admin/users/${user.id}?created=1`);
}

export async function adminUpdateUser(userId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = userSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { name, role, companyId, isAdmin, password } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  const existing = await db.user.findUnique({ where: { id: userId } });
  if (!existing) return { error: "User not found." };
  if (userId === admin.id && !isAdmin) return { error: "You can't remove your own admin access." };
  if (!isAdmin && !companyId) return { error: "Pick the account this user belongs to, or make them an admin." };
  if (email !== existing.email && (await db.user.findUnique({ where: { email } }))) return { error: "That email is already used." };
  if (password && password.length < MIN_PASSWORD) return { error: `A new password needs ${MIN_PASSWORD}+ characters.` };

  await db.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      role,
      isAdmin,
      companyId: isAdmin ? null : companyId,
      // A password set by an admin also signs the user out everywhere.
      ...(password ? { passwordHash: await bcrypt.hash(password, 10), sessionsValidAfter: new Date() } : {}),
    },
  });
  await audit(admin.id, "user.updated", "User", userId, [email, isAdmin && "admin", password && "password reset"].filter(Boolean).join(", "));
  refresh();
  return { ok: password ? "Saved. Share the new password with them directly." : "Saved." };
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (userId === admin.id) redirect(`/admin/users/${userId}?error=self`);
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { bookingsRequested: true, inspections: true, confirmations: true, reviews: true, auditLogs: true } } },
  });
  if (!user) redirect("/admin/users");
  const c = user._count;
  if (c.bookingsRequested + c.inspections + c.confirmations + c.reviews + c.auditLogs > 0) {
    redirect(`/admin/users/${userId}?error=history`);
  }
  await db.$transaction([
    db.vehicle.updateMany({ where: { driver: { userId } }, data: { driverId: null } }),
    db.driver.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  await audit(admin.id, "user.deleted", "User", userId, user.email);
  refresh();
  redirect("/admin/users?deleted=1");
}

// ── Vehicles ──────────────────────────────────────────────────────────────

const REVIEW = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

export async function adminCreateVehicle(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const companyId = String(form.get("companyId") ?? "");
  const owner = await db.company.findUnique({ where: { id: companyId }, include: { users: { include: { driver: true } } } });
  if (!owner) return { error: "Pick the owner account." };
  const parsed = vehicleData(form);
  if ("error" in parsed) return { error: parsed.error };
  const reviewStatus = REVIEW.includes(String(form.get("reviewStatus"))) ? String(form.get("reviewStatus")) : "DRAFT";
  const driverId = owner.users.find((u) => u.driver)?.driver?.id ?? null;

  const vehicle = await db.vehicle.create({ data: { ...parsed.data, companyId, driverId, reviewStatus } });
  if (owner.accountType !== "OWNER") await db.company.update({ where: { id: companyId }, data: { accountType: "OWNER" } });
  await audit(admin.id, "vehicle.created", "Vehicle", vehicle.id, `${vehicle.make} ${vehicle.model} ${vehicle.plateNumber}`);
  refresh();
  redirect(`/admin/vehicles/${vehicle.id}?created=1`);
}

export async function adminUpdateVehicle(vehicleId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = vehicleData(form);
  if ("error" in parsed) return { error: parsed.error };
  const reviewStatus = REVIEW.includes(String(form.get("reviewStatus"))) ? String(form.get("reviewStatus")) : undefined;
  await db.vehicle.update({ where: { id: vehicleId }, data: { ...parsed.data, ...(reviewStatus ? { reviewStatus } : {}) } });
  await audit(admin.id, "vehicle.updated", "Vehicle", vehicleId, reviewStatus ? `review ${reviewStatus}` : "");
  refresh();
  return { ok: "Vehicle saved." };
}

export async function adminDeleteVehicle(vehicleId: string): Promise<void> {
  const admin = await requireAdmin();
  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId }, include: { _count: { select: { bookings: true } } } });
  if (!vehicle) redirect("/admin/vehicles");
  if (vehicle._count.bookings > 0) redirect(`/admin/vehicles/${vehicleId}?error=history`);
  await db.vehicle.delete({ where: { id: vehicleId } });
  await audit(admin.id, "vehicle.deleted", "Vehicle", vehicleId, `${vehicle.make} ${vehicle.model} ${vehicle.plateNumber}`);
  refresh();
  redirect("/admin/vehicles?deleted=1");
}
