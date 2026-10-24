// The heart of Downtime: a vehicle can be rented for a period only if every day of it
// falls inside one of the host's downtime windows AND no confirmed booking overlaps it.
// Pure functions, no database, so the rule is easy to test.

import { HOST_FEE_RATE, MAX_BOOKING_DAYS, RENTER_FEE_RATE } from "./constants";
import { daysInclusive, eachDay } from "./dates";

export type WindowLike = {
  kind: string;
  weekdays: string;
  startDate: Date | null;
  endDate: Date | null;
};

export type BookingLike = {
  startDate: Date;
  endDate: Date;
  status: string;
};

export function parseWeekdays(weekdays: string): number[] {
  return weekdays
    .split(",")
    .filter((s) => s.trim() !== "")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

export function dayInWindow(window: WindowLike, day: Date): boolean {
  if (window.startDate && day < window.startDate) return false;
  if (window.endDate && day > window.endDate) return false;
  if (window.kind === "RANGE") return window.startDate !== null && window.endDate !== null;
  if (window.kind === "WEEKLY") return parseWeekdays(window.weekdays).includes(day.getUTCDay());
  return false;
}

export function dayInDowntime(windows: WindowLike[], day: Date): boolean {
  return windows.some((w) => dayInWindow(w, day));
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function dayBooked(bookings: BookingLike[], day: Date): boolean {
  return bookings.some(
    (b) => b.status === "CONFIRMED" && overlaps(b.startDate, b.endDate, day, day),
  );
}

export type Availability = { ok: true; days: number } | { ok: false; reason: string };

export function checkAvailability(
  windows: WindowLike[],
  bookings: BookingLike[],
  start: Date,
  end: Date,
): Availability {
  if (end < start) return { ok: false, reason: "The end date is before the start date." };
  const days = daysInclusive(start, end);
  if (days > MAX_BOOKING_DAYS) {
    return { ok: false, reason: `Bookings are limited to ${MAX_BOOKING_DAYS} days.` };
  }
  const notIdle = eachDay(start, end).find((d) => !dayInDowntime(windows, d));
  if (notIdle) {
    return { ok: false, reason: "The host needs this vehicle on some of those days." };
  }
  const clash = bookings.find(
    (b) => b.status === "CONFIRMED" && overlaps(b.startDate, b.endDate, start, end),
  );
  if (clash) return { ok: false, reason: "Already booked for some of those days." };
  return { ok: true, days };
}

export type Quote = {
  days: number;
  subtotalCents: number;
  renterFeeCents: number;
  hostFeeCents: number;
  renterTotalCents: number;
  hostPayoutCents: number;
};

export function quote(dailyRateCents: number, days: number): Quote {
  const subtotalCents = dailyRateCents * days;
  const renterFeeCents = Math.round(subtotalCents * RENTER_FEE_RATE);
  const hostFeeCents = Math.round(subtotalCents * HOST_FEE_RATE);
  return {
    days,
    subtotalCents,
    renterFeeCents,
    hostFeeCents,
    renterTotalCents: subtotalCents + renterFeeCents,
    hostPayoutCents: subtotalCents - hostFeeCents,
  };
}
