// Rentals are whole days on the Manila calendar. A calendar day is stored as UTC midnight
// of that date, so a day means the same thing on the server and in every browser.

import { APP_TIMEZONE, LOCALE } from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parses "YYYY-MM-DD" to UTC midnight, or null if it is not a real date. */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value || !DAY_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatDay(date) !== value) return null;
  return date;
}

export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The calendar date in Manila at the given instant, as a UTC-midnight day. */
export function manilaDay(instant: Date = new Date()): Date {
  // en-CA formats as YYYY-MM-DD.
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(instant);
  return parseDay(ymd)!;
}

export function today(): Date {
  return manilaDay();
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/** Number of days from start to end, both included. */
export function daysInclusive(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

export function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

/** A calendar day, e.g. "Nov 2, 2026". */
export function displayDay(date: Date): string {
  return date.toLocaleDateString(LOCALE, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** An instant in Manila time, e.g. "Nov 2, 2026, 3:15 PM". */
export function displayDateTime(date: Date): string {
  return date.toLocaleString(LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  });
}
