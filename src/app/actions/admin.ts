"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { commissionSchema, saveCommissionSettings } from "@/lib/settings";
import { firstError, type ActionState } from "@/lib/util";

const refresh = () => revalidatePath("/admin", "layout");

// ── Accounts ──────────────────────────────────────────────────────────────

const ACCOUNT_STATUSES = ["VERIFIED", "REJECTED", "SUSPENDED"] as const;

export async function setCompanyStatus(companyId: string, status: (typeof ACCOUNT_STATUSES)[number]): Promise<void> {
  const admin = await requireAdmin();
  if (!ACCOUNT_STATUSES.includes(status)) return;
  await db.company.update({ where: { id: companyId }, data: { status } });
  await audit(admin.id, `account.${status.toLowerCase()}`, "Company", companyId);
  refresh();
}

// ── Vehicles and drivers ──────────────────────────────────────────────────

export async function reviewVehicle(vehicleId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const decision = form.get("decision");
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  if (decision !== "APPROVED" && decision !== "REJECTED") return { error: "Choose approve or request changes." };
  if (decision === "REJECTED" && note.length < 5) return { error: "Tell the owner what to fix." };
  await db.vehicle.update({ where: { id: vehicleId }, data: { reviewStatus: decision, reviewNote: decision === "REJECTED" ? note : "" } });
  await audit(admin.id, `vehicle.${decision.toLowerCase()}`, "Vehicle", vehicleId, note);
  refresh();
  return { ok: decision === "APPROVED" ? "Vehicle approved." : "Changes requested." };
}

export async function reviewDriver(driverId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const decision = form.get("decision");
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  if (!["APPROVED", "REJECTED", "SUSPENDED"].includes(String(decision))) return { error: "Choose a decision." };
  if (decision !== "APPROVED" && note.length < 5) return { error: "Give the driver a reason." };
  await db.driver.update({ where: { id: driverId }, data: { status: String(decision), reviewNote: decision === "APPROVED" ? "" : note } });
  await audit(admin.id, `driver.${String(decision).toLowerCase()}`, "Driver", driverId, note);
  refresh();
  return { ok: "Driver updated." };
}

export async function reviewDocument(documentId: string, status: "APPROVED" | "REJECTED", note = ""): Promise<void> {
  const admin = await requireAdmin();
  await db.document.update({ where: { id: documentId }, data: { status, reviewNote: note } });
  await audit(admin.id, `document.${status.toLowerCase()}`, "Document", documentId, note);
  refresh();
}

export async function rejectDocument(documentId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const note = String(form.get("note") ?? "").trim().slice(0, 300);
  if (note.length < 5) return { error: "Say why, e.g. blurry or expired." };
  await reviewDocument(documentId, "REJECTED", note);
  return { ok: "Rejected." };
}

/** Hide or restore a listing regardless of the host's own switch. */
export async function setVehicleBlocked(vehicleId: string, blocked: boolean): Promise<void> {
  const admin = await requireAdmin();
  await db.vehicle.update({ where: { id: vehicleId }, data: { blocked } });
  await audit(admin.id, blocked ? "vehicle.hidden" : "vehicle.restored", "Vehicle", vehicleId);
  refresh();
}

// ── Bookings, money and issues ────────────────────────────────────────────

/** Support override: cancel an open booking. A paid one is flagged for refund. */
export async function adminCancelBooking(bookingId: string): Promise<void> {
  const admin = await requireAdmin();
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || !["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED"].includes(booking.status)) return;
  await db.$transaction([
    db.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } }),
    db.payment.updateMany({ where: { bookingId, status: "PAID" }, data: { refundNeeded: true } }),
  ]);
  await audit(admin.id, "booking.cancelled", "Booking", bookingId);
  refresh();
}

export async function resolveIssue(bookingId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const resolution = String(form.get("resolution") ?? "").trim();
  if (resolution.length < 5) return { error: "Record how it was resolved." };
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Booking not found." };
  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { issue: `${booking.issue}\n\n[Downtime support] ${resolution.slice(0, 1000)}`, issueResolvedAt: new Date() },
    }),
    db.payout.updateMany({ where: { bookingId, status: "ON_HOLD" }, data: { status: "PENDING" } }),
  ]);
  await audit(admin.id, "issue.resolved", "Booking", bookingId, resolution);
  refresh();
  return { ok: "Issue resolved; payout released." };
}

export async function markPayoutPaid(payoutId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const reference = String(form.get("reference") ?? "").trim();
  if (reference.length < 3) return { error: "Enter the bank or GCash reference number." };
  const updated = await db.payout.updateMany({
    where: { id: payoutId, status: "PENDING" },
    data: { status: "PAID", reference: reference.slice(0, 80), paidAt: new Date() },
  });
  if (updated.count === 0) return { error: "Only pending payouts can be marked paid." };
  await audit(admin.id, "payout.paid", "Payout", payoutId, reference);
  refresh();
  return { ok: "Payout recorded." };
}

export async function markRefunded(paymentId: string): Promise<void> {
  const admin = await requireAdmin();
  await db.payment.updateMany({ where: { id: paymentId, refundNeeded: true, refundedAt: null }, data: { refundedAt: new Date() } });
  await audit(admin.id, "payment.refunded", "Payment", paymentId);
  refresh();
}

// ── Commission ────────────────────────────────────────────────────────────

const pct = (v: FormDataEntryValue | null) => Math.round(Number(v) * 100);

export async function updateCommission(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const baseBps: Record<string, number> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("base_")) baseBps[key.slice(5)] = pct(value);
  }
  const tiers = [0, 1, 2]
    .map((i) => ({
      minRating: Number(form.get(`tier${i}_rating`)),
      minReviews: Number(form.get(`tier${i}_reviews`)),
      discountBps: pct(form.get(`tier${i}_discount`)),
    }))
    .filter((t) => t.minRating > 0);
  const parsed = commissionSchema.safeParse({
    renterFeeBps: pct(form.get("renterFee")),
    floorBps: pct(form.get("floor")),
    baseBps,
    tiers,
  });
  if (!parsed.success) return { error: `Check the values: ${firstError(parsed.error)}` };
  await saveCommissionSettings(parsed.data);
  await audit(admin.id, "commission.updated", "Setting", "commission", JSON.stringify(parsed.data));
  refresh();
  return { ok: "Saved. New rates apply to bookings requested from now on." };
}
