import { VEHICLE_TYPES, type VehicleType } from "./constants";
import { addDays } from "./dates";
import { db } from "./db";
import { vehicleTitle } from "./listings";
import type { PaidBooking } from "./reports";

export const categoryLabel = (type: string) => VEHICLE_TYPES[type as VehicleType] ?? type;

/** Paid bookings whose payment landed between two Manila days (with a day of slack for the timezone). */
export async function loadPaidBookings(from: Date, to: Date) {
  const payments = await db.payment.findMany({
    where: { status: "PAID", paidAt: { gte: addDays(from, -1), lt: addDays(to, 2) } },
    include: {
      booking: {
        include: { vehicle: { include: { company: true } }, renterCompany: true, driver: { include: { user: true } } },
      },
    },
    orderBy: { paidAt: "asc" },
  });
  return payments.map((p) => ({
    payment: p,
    row: {
      id: p.bookingId,
      paidAt: p.paidAt!,
      amountCents: p.amountCents,
      refundNeeded: p.refundNeeded,
      renterFeeCents: p.booking.renterFeeCents,
      hostFeeCents: p.booking.hostFeeCents,
      vehicleCents: p.booking.vehicleCents,
      driverCents: p.booking.driverCents,
      mode: p.booking.mode,
      vehicle: {
        id: p.booking.vehicleId,
        label: `${vehicleTitle(p.booking.vehicle)} · ${p.booking.vehicle.plateNumber}`,
        type: p.booking.vehicle.type,
        ownerId: p.booking.vehicle.companyId,
        ownerName: p.booking.vehicle.company.name,
      },
    } satisfies PaidBooking,
  }));
}

/** Money position to date: what came in, went back out, and is still owed. */
export async function loadCashPosition() {
  const [collected, refunded, refundsPending, paidOut, owed, onHold] = await Promise.all([
    db.payment.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
    db.payment.aggregate({ where: { status: "PAID", refundedAt: { not: null } }, _sum: { amountCents: true } }),
    db.payment.aggregate({ where: { status: "PAID", refundNeeded: true, refundedAt: null }, _sum: { amountCents: true }, _count: true }),
    db.payout.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
    db.payout.aggregate({ where: { status: "PENDING" }, _sum: { amountCents: true }, _count: true }),
    db.payout.aggregate({ where: { status: "ON_HOLD" }, _sum: { amountCents: true }, _count: true }),
  ]);
  const c = collected._sum.amountCents ?? 0;
  const r = refunded._sum.amountCents ?? 0;
  const p = paidOut._sum.amountCents ?? 0;
  return {
    collectedCents: c,
    refundedCents: r,
    refundsPendingCents: refundsPending._sum.amountCents ?? 0,
    refundsPendingCount: refundsPending._count,
    paidOutCents: p,
    owedCents: owed._sum.amountCents ?? 0,
    owedCount: owed._count,
    onHoldCents: onHold._sum.amountCents ?? 0,
    onHoldCount: onHold._count,
    heldCents: c - r - p,
  };
}
