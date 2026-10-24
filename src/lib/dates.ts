// Rentals are whole days. Every date is a UTC midnight so a day means the same thing
// on the server and in every browser.

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

export function today(): Date {
  return parseDay(formatDay(new Date()))!;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
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

export function displayDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
