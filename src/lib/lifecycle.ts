// Booking state machine. Pure functions: callers load the booking, ask what's allowed,
// then write the result. Keeps every rule about "who can do what, when" in one place.

import { PAYMENT_WINDOW_HOURS } from "./constants";
import { addDays, addHours, manilaDay } from "./dates";

export type Party = "host" | "renter";

type BookingState = {
  status: string;
  startDate: Date;
  paymentDueAt?: Date | null;
};

/** Approval holds the dates for the payment window, but never past the start of the rental day. */
export function paymentDeadline(approvedAt: Date, startDate: Date): Date {
  const window = addHours(approvedAt, PAYMENT_WINDOW_HOURS);
  // Start date is a Manila calendar day; its Manila midnight is 16:00 UTC the day before.
  const startOfRentalManila = addHours(startDate, -8);
  return window < startOfRentalManila ? window : startOfRentalManila;
}

export function isPaymentOverdue(b: BookingState, now: Date = new Date()): boolean {
  return b.status === "AWAITING_PAYMENT" && !!b.paymentDueAt && b.paymentDueAt <= now;
}

export function canApproveOrDecline(b: BookingState): boolean {
  return b.status === "REQUESTED";
}

export function canPay(b: BookingState, now: Date = new Date()): boolean {
  return b.status === "AWAITING_PAYMENT" && !isPaymentOverdue(b, now);
}

/** The renter can withdraw until they're on the road; a paid booking then needs a refund. */
export function canRenterCancel(b: BookingState): boolean {
  return ["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED"].includes(b.status);
}

/** Pick-up checklist opens the day before the rental starts. */
export function canStartPickup(b: BookingState, now: Date = new Date()): boolean {
  return b.status === "CONFIRMED" && manilaDay(now) >= addDays(b.startDate, -1);
}

export function canStartReturn(b: BookingState): boolean {
  return b.status === "IN_PROGRESS";
}

/** What a confirmed checklist moves the booking to. */
export function statusAfterConfirmed(phase: "PICKUP" | "RETURN"): "IN_PROGRESS" | "COMPLETED" {
  return phase === "PICKUP" ? "IN_PROGRESS" : "COMPLETED";
}

/** A checklist is confirmed by the party who didn't fill it in. */
export function canConfirmInspection(createdBy: Party, confirmer: Party, alreadyConfirmed: boolean): boolean {
  return !alreadyConfirmed && createdBy !== confirmer;
}

/** Distance driven and fuel change between the two checklists, for the return summary. */
export function compareInspections(
  pickup: { odometerKm: number; fuelQuarters: number },
  ret: { odometerKm: number; fuelQuarters: number },
): { distanceKm: number; fuelChangeQuarters: number; odometerWentBack: boolean } {
  return {
    distanceKm: Math.max(0, ret.odometerKm - pickup.odometerKm),
    fuelChangeQuarters: ret.fuelQuarters - pickup.fuelQuarters,
    odometerWentBack: ret.odometerKm < pickup.odometerKm,
  };
}
