"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BLOCKING_STATUSES, checkAvailability, isBlocking, overlaps } from "@/lib/availability";
import { hostCommissionBps, priceBooking } from "@/lib/commission";
import { parseDay, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { withTxRetry } from "@/lib/db-retry";
import { invalidateListings } from "@/lib/listing-cache";
import { bookingEligibility } from "@/lib/eligibility";
import { PHONE_HINT, normalizePhone } from "@/lib/phone";
import { env, paymentsSimulated } from "@/lib/env";
import { canApproveOrDecline, canPay, canRenterCancel, paymentDeadline } from "@/lib/lifecycle";
import { lockVehicle } from "@/lib/locks";
import { createCheckoutSession } from "@/lib/paymongo";
import { expireOverdueBookings, markPaymentPaid } from "@/lib/payments";
import { driverBookable, listableWhere, vehicleTitle } from "@/lib/listings";
import { requireCompanyUser } from "@/lib/session";
import { getCommissionSettings } from "@/lib/settings";
import { canManageFleet, formatCents, type ActionState } from "@/lib/util";

export async function requestBooking(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  if (!canManageFleet(me.role)) return { error: "Ask an owner or fleet manager to book." };

  const start = parseDay(form.get("start") as string);
  const end = parseDay(form.get("end") as string);
  if (!start || !end) return { error: "Pick a pick-up and return date." };
  if (start < today()) return { error: "The pick-up date is in the past." };

  const mode = form.get("mode") === "WITH_DRIVER" ? "WITH_DRIVER" : "SELF_DRIVE";

  await expireOverdueBookings();
  const vehicle = await db.vehicle.findFirst({
    where: { id: form.get("vehicleId") as string, ...listableWhere() },
    include: { windows: true, driver: true, bookings: { where: { status: { in: BLOCKING_STATUSES } } } },
  });
  if (!vehicle) return { error: "That vehicle is no longer listed." };
  if (vehicle.companyId === me.companyId) return { error: "You can't book your own vehicle." };

  if (mode === "WITH_DRIVER" && !driverBookable(vehicle)) return { error: "This vehicle isn't available with a driver." };
  if (mode === "SELF_DRIVE" && !vehicle.selfDriveAllowed) return { error: "This vehicle is only available with a driver." };
  // A renter without a number on file types it in the booking box; save it with the request.
  let account = me.company;
  const typedPhone = String(form.get("phone") ?? "").trim();
  if (!account.phone && typedPhone) {
    const phone = normalizePhone(typedPhone);
    if (!phone) return { error: PHONE_HINT };
    account = await db.company.update({ where: { id: account.id }, data: { phone } });
  }

  // With a driver needs no ID; self-drive needs a verified ID and a valid licence.
  const eligible = bookingEligibility(account, mode, end);
  if (!eligible.ok) return { error: eligible.reason };
  // Registration and insurance must stay valid for the whole rental.
  if (vehicle.registrationExpiry < end || vehicle.insuranceExpiry < end) {
    return { error: "This vehicle's registration or insurance lapses before your return date. Pick earlier dates." };
  }

  const availability = checkAvailability(vehicle.windows, vehicle.bookings, start, end);
  if (!availability.ok) return { error: availability.reason };

  const settings = await getCommissionSettings();
  const withDriver = mode === "WITH_DRIVER";
  const price = priceBooking({
    days: availability.days,
    dailyRateCents: vehicle.dailyRateCents,
    driverDailyRateCents: vehicle.driverDailyRateCents,
    withDriver,
    renterFeeBps: settings.renterFeeBps,
    hostCommissionBps: hostCommissionBps(settings, vehicle.type, withDriver ? vehicle.driver : null),
  });
  const booking = await db.booking.create({
    data: {
      vehicleId: vehicle.id,
      renterCompanyId: me.companyId,
      requestedById: me.id,
      mode,
      driverId: withDriver ? vehicle.driverId : null,
      startDate: start,
      endDate: end,
      days: price.days,
      vehicleCents: price.vehicleCents,
      driverCents: price.driverCents,
      renterFeeBps: price.renterFeeBps,
      renterFeeCents: price.renterFeeCents,
      hostCommissionBps: price.hostCommissionBps,
      hostFeeCents: price.hostFeeCents,
      note: String(form.get("note") ?? "").trim().slice(0, 500),
    },
  });
  redirect(`/bookings/${booking.id}?sent=1`);
}

/** Host approves (dates are held while the renter pays) or declines a request. */
export async function respondToBooking(bookingId: string, decision: "APPROVE" | "DECLINE"): Promise<void> {
  const me = await requireCompanyUser();
  if (!canManageFleet(me.role)) return;

  const booking = await db.booking.findFirst({ where: { id: bookingId, vehicle: { companyId: me.companyId } } });
  if (!booking || !canApproveOrDecline(booking)) return;

  if (decision === "DECLINE") {
    await db.booking.update({ where: { id: booking.id }, data: { status: "DECLINED" } });
  } else {
    await expireOverdueBookings();
    let approved: boolean;
    try {
      approved = await withTxRetry(() =>
        db.$transaction(async (tx) => {
          await lockVehicle(tx, booking.vehicleId);
          const others = await tx.booking.findMany({
            where: { vehicleId: booking.vehicleId, id: { not: booking.id }, status: { in: BLOCKING_STATUSES } },
          });
          if (others.some((o) => isBlocking(o) && overlaps(o.startDate, o.endDate, booking.startDate, booking.endDate))) {
            return false;
          }
          const now = new Date();
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: "AWAITING_PAYMENT", approvedAt: now, paymentDueAt: paymentDeadline(now, booking.startDate) },
          });
          return true;
        }),
      );
    } catch (error) {
      console.error("approve failed after retries", error);
      redirect(`/bookings/${booking.id}?error=busy`);
    }
    if (!approved) redirect(`/bookings/${booking.id}?error=clash`);
  }
  invalidateListings();
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${booking.id}`);
}

/** Sends the renter to PayMongo's hosted checkout (GCash, Maya, cards, QR Ph). */
export async function payForBooking(bookingId: string): Promise<void> {
  const me = await requireCompanyUser();
  await expireOverdueBookings();
  const booking = await db.booking.findFirst({
    where: { id: bookingId, renterCompanyId: me.companyId },
    include: { vehicle: true },
  });
  if (!booking || !canPay(booking)) redirect(`/bookings/${bookingId}?error=payment`);

  const amountCents = booking.vehicleCents + booking.driverCents + booking.renterFeeCents;

  if (paymentsSimulated()) {
    // Development without PayMongo keys: record the payment as if checkout succeeded.
    const payment = await db.payment.create({ data: { bookingId: booking.id, provider: "SIMULATED", amountCents } });
    await markPaymentPaid(payment.id);
    redirect(`/bookings/${booking.id}?paid=1`);
  }

  const { APP_URL, PAYMONGO_SECRET_KEY } = env();
  const session = await createCheckoutSession({
    secretKey: PAYMONGO_SECRET_KEY!,
    amountCents,
    name: `${vehicleTitle(booking.vehicle)} · ${booking.days} day${booking.days === 1 ? "" : "s"}${booking.mode === "WITH_DRIVER" ? " with driver" : ""}`,
    description: `GRace booking ${booking.id} (${formatCents(amountCents)})`,
    referenceNumber: booking.id,
    successUrl: `${APP_URL}/bookings/${booking.id}?paid=1`,
    cancelUrl: `${APP_URL}/bookings/${booking.id}`,
    metadata: { bookingId: booking.id },
  });
  await db.payment.create({
    data: {
      bookingId: booking.id,
      provider: "PAYMONGO",
      checkoutSessionId: session.id,
      checkoutUrl: session.checkoutUrl,
      amountCents,
    },
  });
  redirect(session.checkoutUrl);
}

/** Renter withdraws. A paid booking is flagged so support refunds it. */
export async function cancelBooking(bookingId: string): Promise<void> {
  const me = await requireCompanyUser();
  if (!canManageFleet(me.role)) return;
  const booking = await db.booking.findFirst({ where: { id: bookingId, renterCompanyId: me.companyId } });
  if (!booking || !canRenterCancel(booking)) return;

  await db.$transaction([
    db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } }),
    db.payment.updateMany({ where: { bookingId: booking.id, status: "PAID" }, data: { refundNeeded: true } }),
  ]);
  invalidateListings();
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${booking.id}`);
}

/** Either side raises a problem (damage, late return, no-show). Holds the host payout until resolved. */
export async function reportIssue(bookingId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  const issue = String(form.get("issue") ?? "").trim();
  if (issue.length < 10) return { error: "Describe the problem in a sentence or two." };

  const booking = await db.booking.findFirst({
    where: { id: bookingId, OR: [{ renterCompanyId: me.companyId }, { vehicle: { companyId: me.companyId } }] },
  });
  if (!booking) return { error: "Booking not found." };

  const stamped = `${booking.issue ? `${booking.issue}\n\n` : ""}[${me.company.name}, ${me.name}] ${issue.slice(0, 1000)}`;
  await db.$transaction([
    db.booking.update({
      where: { id: booking.id },
      data: { issue: stamped, issueOpenedAt: booking.issueOpenedAt ?? new Date(), issueResolvedAt: null },
    }),
    db.payout.updateMany({ where: { bookingId: booking.id, status: "PENDING" }, data: { status: "ON_HOLD" } }),
  ]);
  invalidateListings();
  revalidatePath(`/bookings/${booking.id}`);
  return { ok: "Reported. GRace support will contact both companies." };
}
