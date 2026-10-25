import { BLOCKING_STATUSES, isBlocking, overlaps } from "./availability";
import { db } from "./db";
import { lockVehicle } from "./locks";

/** Unpaid approvals past their deadline give their dates back. Cheap; run before reading bookings. */
export async function expireOverdueBookings(): Promise<void> {
  await db.booking.updateMany({
    where: { status: "AWAITING_PAYMENT", paymentDueAt: { lte: new Date() } },
    data: { status: "EXPIRED" },
  });
}

/**
 * Marks a payment paid and confirms its booking. Idempotent: PayMongo retries webhooks.
 * If the booking can no longer be confirmed (cancelled, expired and re-booked), the payment
 * is flagged for a refund instead.
 */
export async function markPaymentPaid(paymentId: string): Promise<"confirmed" | "refund" | "already"> {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { booking: true } });
    if (!payment) throw new Error(`Unknown payment ${paymentId}`);
    if (payment.status === "PAID") return "already";
    await lockVehicle(tx, payment.booking.vehicleId);

    const now = new Date();
    const booking = payment.booking;
    const others = await tx.booking.findMany({
      where: { vehicleId: booking.vehicleId, id: { not: booking.id }, status: { in: BLOCKING_STATUSES } },
    });
    const clash = others.some((o) => isBlocking(o, now) && overlaps(o.startDate, o.endDate, booking.startDate, booking.endDate));
    const confirmable = (booking.status === "AWAITING_PAYMENT" || booking.status === "EXPIRED") && !clash;

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: now, refundNeeded: !confirmable },
    });
    if (!confirmable) return "refund";

    await tx.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED", paidAt: now } });
    return "confirmed";
  });
}
