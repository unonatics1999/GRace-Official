// The heart of GRace: a vehicle can be rented for a period only if every day of it
// falls inside one of the host's downtime windows AND no confirmed booking overlaps it.
// Pure functions, no database, so the rule is easy to test.

import { MAX_BOOKING_DAYS } from "./constants";
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
  paymentDueAt?: Date | null;
};

/** Statuses that hold a vehicle's dates. Load these from the database for availability checks. */
export const BLOCKING_STATUSES = ["AWAITING_PAYMENT", "CONFIRMED", "IN_PROGRESS"];

/** A booking holds its dates once approved; an approved one stops holding them when its payment window lapses. */
export function isBlocking(b: BookingLike, now: Date = new Date()): boolean {
  if (b.status === "CONFIRMED" || b.status === "IN_PROGRESS") return true;
  if (b.status === "AWAITING_PAYMENT") return !b.paymentDueAt || b.paymentDueAt > now;
  return false;
}

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

export function dayBooked(bookings: BookingLike[], day: Date, now: Date = new Date()): boolean {
  return bookings.some((b) => isBlocking(b, now) && overlaps(b.startDate, b.endDate, day, day));
}

export type Availability = { ok: true; days: number } | { ok: false; reason: string };

export function checkAvailability(
  windows: WindowLike[],
  bookings: BookingLike[],
  start: Date,
  end: Date,
  now: Date = new Date(),
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
  const clash = bookings.find((b) => isBlocking(b, now) && overlaps(b.startDate, b.endDate, start, end));
  if (clash) return { ok: false, reason: "Already booked for some of those days." };
  return { ok: true, days };
}
